'use client';

import { memo, useCallback } from 'react';
import { Trash2, Check } from 'lucide-react';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  stockInputs: {[key: string]: {decrease: string, increase: string}};
  onStockInputChange: (id: string, field: 'decrease' | 'increase', value: string) => void;
  onStockUpdate: (id: string, field: 'increase' | 'decrease') => void;
  onDeleteProduct: (id: string, sku: string) => void;
  getStockStatus: (stock: number) => { status: string; color: string };
  getStockPercentage: (stock: number) => string;
}

export const ProductCard = memo<ProductCardProps>(({
  product,
  stockInputs,
  onStockInputChange,
  onStockUpdate,
  onDeleteProduct,
  getStockStatus,
  getStockPercentage
}) => {
  const stockStatus = getStockStatus(product.currentStock);
  const stockValue = product.currentStock * product.price;

  const handleInputChange = useCallback((field: 'decrease' | 'increase', value: string) => {
    onStockInputChange(product.id, field, value);
  }, [product.id, onStockInputChange]);

  const handleUpdate = useCallback((field: 'increase' | 'decrease') => {
    // 立即清空输入框，防止重复提交
    onStockInputChange(product.id, field, '');
    // 延迟执行更新操作，确保输入框已清空
    setTimeout(() => {
      onStockUpdate(product.id, field);
    }, 50);
  }, [product.id, onStockUpdate, onStockInputChange]);

  const handleDelete = useCallback(() => {
    onDeleteProduct(product.id, product.sku);
  }, [product.id, product.sku, onDeleteProduct]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {product.sku}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <div>
          <span className="font-medium">{product.currentStock}</span>
          <span className="text-xs text-gray-500 ml-2">
            ({getStockPercentage(product.currentStock)}%)
          </span>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        ₽{product.price}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        ₽{Math.round(stockValue)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
          {stockStatus.status}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="出库数量"
              value={stockInputs[product.id]?.decrease || ''}
              onChange={(e) => handleInputChange('decrease', e.target.value)}
              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleUpdate('decrease')}
              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
              title="确认出库"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
          <div className="text-xs text-gray-500">
            总出库: {product.totalOut}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="入库数量"
              value={stockInputs[product.id]?.increase || ''}
              onChange={(e) => handleInputChange('increase', e.target.value)}
              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => handleUpdate('increase')}
              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
              title="确认入库"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
          <div className="text-xs text-gray-500">
            总入库: {product.totalIn}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <button
          onClick={handleDelete}
          className="text-red-600 hover:text-red-900"
          title="删除产品"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

ProductCard.displayName = 'ProductCard';

// 移动端产品卡片组件
interface ProductMobileCardProps {
  product: Product;
  stockInputs: {[key: string]: {decrease: string, increase: string}};
  onStockInputChange: (id: string, field: 'decrease' | 'increase', value: string) => void;
  onStockUpdate: (id: string, field: 'increase' | 'decrease') => void;
  onDeleteProduct: (id: string, sku: string) => void;
  getStockStatus: (stock: number) => { status: string; color: string };
  getStockPercentage: (stock: number) => string;
}

export const ProductMobileCard = memo<ProductMobileCardProps>(({
  product,
  stockInputs,
  onStockInputChange,
  onStockUpdate,
  onDeleteProduct,
  getStockStatus,
  getStockPercentage
}) => {
  const stockStatus = getStockStatus(product.currentStock);
  const stockValue = product.currentStock * product.price;

  const handleInputChange = useCallback((field: 'decrease' | 'increase', value: string) => {
    onStockInputChange(product.id, field, value);
  }, [product.id, onStockInputChange]);

  const handleUpdate = useCallback((field: 'increase' | 'decrease') => {
    onStockUpdate(product.id, field);
  }, [product.id, onStockUpdate]);

  const handleDelete = useCallback(() => {
    onDeleteProduct(product.id, product.sku);
  }, [product.id, product.sku, onDeleteProduct]);

  return (
    <div className="border-b border-gray-200 p-4 space-y-4">
      {/* 产品基本信息 */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-900">{product.sku}</h3>
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">库存:</span>
              <span className="text-sm font-medium">{product.currentStock}</span>
              <span className="text-xs text-gray-500">({getStockPercentage(product.currentStock)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">单价:</span>
              <span className="text-sm font-medium">₽{product.price}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">价值:</span>
              <span className="text-sm font-medium">₽{Math.round(stockValue)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
            {stockStatus.status}
          </span>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-900 p-1"
            title="删除产品"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 出库操作 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 w-16">出库:</span>
          <input
            type="number"
            placeholder="数量"
            value={stockInputs[product.id]?.decrease || ''}
            onChange={(e) => handleInputChange('decrease', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            onClick={() => handleUpdate('decrease')}
            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            title="确认出库"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 pl-20">
          总出库: {product.totalOut}
        </div>
      </div>

      {/* 入库操作 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 w-16">入库:</span>
          <input
            type="number"
            placeholder="数量"
            value={stockInputs[product.id]?.increase || ''}
            onChange={(e) => handleInputChange('increase', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={() => handleUpdate('increase')}
            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            title="确认入库"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 pl-20">
          总入库: {product.totalIn}
        </div>
      </div>
    </div>
  );
});

ProductMobileCard.displayName = 'ProductMobileCard';