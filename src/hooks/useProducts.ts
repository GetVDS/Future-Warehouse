'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Statistics } from '@/types';
import { api } from '@/lib/client-api';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalProducts: 0,
    totalStock: 0,
    totalOut: 0,
    totalIn: 0,
    lowStockCount: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'stock' | 'sku'>('stock');
  const [dataFetched, setDataFetched] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (dataFetched) return; // 防止重复调用
    
    try {
      setLoading(true);
      // 启用客户端缓存，缓存5分钟
      const response = await api.get('/api/products', { cache: true });
      console.log('获取产品数据响应:', response);
      if (response.success && response.data?.products) {
        console.log('更新产品数据:', response.data.products);
        setProducts(response.data.products);
        calculateStatistics(response.data.products);
        setDataFetched(true);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [dataFetched]);

  // 优化：乐观更新函数
  const optimisticUpdateProduct = useCallback((productId: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, ...updates } : p
    ));
  }, []);

  // 新增：更新单个产品数据的函数
  const updateProduct = useCallback(async (productId: string) => {
    try {
      // 清除缓存以获取最新数据
      api.clearCache('/api/products');
      const response = await api.get('/api/products', { cache: true });
      if (response.success && response.data?.products) {
        const updatedProduct = response.data.products.find((p: Product) => p.id === productId);
        if (updatedProduct) {
          setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
          calculateStatistics(response.data.products);
        }
      }
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  }, []);

  const calculateStatistics = useCallback((products: Product[]) => {
    const stats = products.reduce((acc, product) => {
      acc.totalProducts++;
      acc.totalStock += product.currentStock;
      acc.totalOut += product.totalOut;
      acc.totalIn += product.totalIn;
      acc.totalValue += product.currentStock * product.price;
      if (product.currentStock < 100) {
        acc.lowStockCount++;
      }
      return acc;
    }, {
      totalProducts: 0,
      totalStock: 0,
      totalOut: 0,
      totalIn: 0,
      lowStockCount: 0,
      totalValue: 0
    });

    setStatistics(stats);
  }, []);

  const getStockStatus = useCallback((stock: number) => {
    if (stock < 100) return { status: '缺货', color: 'text-red-600 bg-red-50', text: '缺货', className: 'bg-red-100 text-red-800' };
    if (stock < 200) return { status: '较少', color: 'text-orange-600 bg-orange-50', text: '较少', className: 'bg-orange-100 text-orange-800' };
    if (stock < 500) return { status: '正常', color: 'text-green-600 bg-green-50', text: '正常', className: 'bg-green-100 text-green-800' };
    return { status: '充足', color: 'text-blue-600 bg-blue-50', text: '充足', className: 'bg-blue-100 text-blue-800' };
  }, []);

  const getStockPercentage = useCallback((stock: number) => {
    if (statistics.totalStock === 0) return '0';
    return ((stock / statistics.totalStock) * 100).toFixed(1);
  }, [statistics.totalStock]);

  const getOutboundRanking = useCallback(() => {
    return [...products]
      .filter(product => product.totalOut > 0)
      .sort((a, b) => b.totalOut - a.totalOut)
      .slice(0, 5);
  }, [products]);

  // 使用 useMemo 优化过滤和排序
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => 
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'stock') {
          return b.currentStock - a.currentStock;
        }
        return a.sku.localeCompare(b.sku);
      });
  }, [products, searchTerm, sortBy]);

  return {
    products,
    setProducts,
    statistics,
    loading,
    searchTerm,
    sortBy,
    filteredProducts,
    getStockStatus,
    getStockPercentage,
    getOutboundRanking,
    setSearchTerm,
    setSortBy,
    fetchProducts,
    updateProduct,
    calculateStatistics
  };
};