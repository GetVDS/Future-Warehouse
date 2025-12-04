'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, User, Phone, Calendar, Package, ShoppingCart, Edit, Users } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
    purchaseRecords: number;
  };
}

interface Order {
  id: string;
  orderNumber: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  orderItems: {
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      sku: string;
    };
  }[];
}

interface PurchaseRecord {
  id: string;
  quantity: number;
  price: number;
  totalAmount: number;
  purchaseDate: string;
  product: {
    id: string;
    sku: string;
  };
}

export default function CustomerDetailPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const router = useRouter();
  const params = useParams();

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // 获取客户详情
  useEffect(() => {
    if (user && params.id) {
      fetchCustomerDetails();
    }
  }, [user, params.id]);

  const fetchCustomerDetails = async () => {
    try {
      // 获取客户基本信息
      const customerResponse = await fetch(`/api/customers/${params.id}`);
      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        setCustomer(customerData.customer);
      }

      // 获取客户订单
      const ordersResponse = await fetch(`/api/orders?customerId=${params.id}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        // 处理不同的响应格式
        if (ordersData.success && ordersData.data) {
          setOrders(ordersData.data.orders || []);
        } else {
          setOrders(ordersData.orders || []);
        }
      }

      // 获取客户购买记录
      const purchasesResponse = await fetch(`/api/purchases?customerId=${params.id}`);
      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json();
        // 处理不同的响应格式
        if (purchasesData.success && purchasesData.data) {
          setPurchaseRecords(purchasesData.data.purchaseRecords || []);
        } else {
          setPurchaseRecords(purchasesData.purchaseRecords || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (customer) {
      setEditName(customer.name);
      setEditPhone(customer.phone);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || '更新失败');
      }
    } catch (error) {
      console.error('Update customer error:', error);
      alert('更新失败，请重试');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
    setEditPhone('');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">客户不存在</h1>
          <button
            onClick={() => router.push('/customers')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回客户列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* PC端布局 */}
          <div className="hidden sm:flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/customers')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                返回客户列表
              </button>
              <h1 className="text-xl font-bold text-gray-900">客户详情</h1>
            </div>
          </div>
          
          {/* 移动端布局 */}
          <div className="sm:hidden">
            <div className="flex justify-between items-center h-12">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/customers')}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h1 className="text-lg font-bold text-gray-900">客户详情</h1>
              </div>
            </div>
            <div className="flex justify-around py-2 border-t">
              <button
                onClick={() => router.push('/')}
                className="flex flex-col items-center p-2 text-gray-600 hover:text-gray-900"
              >
                <Package className="h-5 w-5" />
                <span className="text-xs mt-1">产品</span>
              </button>
              <div className="flex flex-col items-center p-2 text-blue-600">
                <Users className="h-5 w-5" />
                <span className="text-xs mt-1">客户</span>
              </div>
              <button
                onClick={() => router.push('/orders')}
                className="flex flex-col items-center p-2 text-gray-600 hover:text-gray-900"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs mt-1">订单</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Customer Info Card - 移动端优化 */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">客户信息</h2>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">编辑</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="px-2 sm:px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2 sm:px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  取消
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-500">客户姓名</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{customer.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-gray-500">手机号</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        setEditPhone(value);
                      }
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={11}
                  />
                ) : (
                  <p
                    className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 select-all"
                    onClick={() => navigator.clipboard.writeText(customer.phone)}
                    title="点击复制手机号"
                  >
                    {customer.phone}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <div>
                <p className="text-xs sm:text-sm text-gray-500">注册时间</p>
                <p className="font-medium text-gray-900">
                  {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <div>
                <p className="text-xs sm:text-sm text-gray-500">订单数量</p>
                <p className="font-medium text-gray-900">{customer._count?.orders || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Records - 移动端优化 */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button className="py-3 sm:py-4 px-4 sm:px-6 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">全部记录</span>
                  <span className="sm:hidden">记录</span>
                  <span className="text-xs">({orders.length})</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* 桌面端表格布局 */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      订单编号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      产品数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      总金额
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* 显示订单记录 */}
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        订单
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        PRAISE{String(order.orderNumber).padStart(4, '0')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderItems.map((item, index) => (
                          <div key={item.id} className="mb-1">
                            {item.product.sku} x {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₽{Math.round(order.totalAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status === 'confirmed' ? '已确认' :
                           order.status === 'pending' ? '待处理' : '已取消'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                  
                  {/* 购买记录已包含在订单中，不再单独显示 */}
                </tbody>
              </table>
            </div>

            {/* 移动端卡片布局 */}
            <div className="lg:hidden space-y-3 sm:space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {/* 订单头部 */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-gray-900 mb-1">
                        PRAISE{String(order.orderNumber).padStart(4, '0')}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">状态:</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.status === 'confirmed' ? '已确认' :
                           order.status === 'pending' ? '待处理' : '已取消'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </div>

                  {/* 订单项 */}
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">产品数量</h4>
                    <div className="space-y-1">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-900">{item.product.sku}</span>
                          <span className="text-gray-600">x {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 金额 */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">总金额</span>
                    <span className="text-base font-medium text-gray-900">₽{Math.round(order.totalAmount)}</span>
                  </div>
                </div>
              ))}
              
              {orders.length === 0 && purchaseRecords.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  暂无交易记录
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
