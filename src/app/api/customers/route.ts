import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证认证的辅助函数
async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - 获取所有客户
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: '未认证' }, { status: 401 });
    }

    // 优化查询：使用聚合查询而不是关联查询来避免N+1问题
    const customers = await db.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: {
              where: {
                status: 'confirmed'
              }
            },
            purchaseRecords: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 获取所有客户的购买记录总金额（使用聚合查询）
    const customerIds = customers.map(c => c.id);
    const purchaseTotals = await db.purchaseRecord.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds }
      },
      _sum: {
        totalAmount: true
      }
    });

    // 创建购买金额映射以便快速查找
    const purchaseTotalMap = new Map(
      purchaseTotals.map(pt => [pt.customerId, pt._sum.totalAmount || 0])
    );

    // 计算每个客户的总购买金额
    const customersWithTotalAmount = customers.map(customer => {
      const totalAmount = purchaseTotalMap.get(customer.id) || 0;
      
      return {
        ...customer,
        totalAmount: Math.round(Number(totalAmount))
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        customers: customersWithTotalAmount
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { error: '获取客户失败' },
      { status: 500 }
    );
  }
}

// POST - 添加新客户
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: '未认证' }, { status: 401 });
    }

    const { name, phone } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: '客户姓名和手机号不能为空' },
        { status: 400 }
      );
    }

    // 检查客户手机号是否已存在
    const existingCustomer = await db.customer.findUnique({
      where: { phone }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: '手机号已存在' },
        { status: 400 }
      );
    }

    // 创建新客户
    const customer = await db.customer.create({
      data: {
        name,
        phone
      },
      include: {
        _count: {
          select: {
            orders: true,
            purchaseRecords: true
          }
        }
      }
    });

    console.log('✅ 客户创建成功:', { id: customer.id, name: customer.name, phone: customer.phone });

    return NextResponse.json({
      success: true,
      data: {
        customer
      }
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { error: '创建客户失败' },
      { status: 500 }
    );
  }
}
