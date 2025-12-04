'use client';

import { memo } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Boxes, Wallet } from 'lucide-react';
import { Statistics } from '@/types';

interface StatisticsCardProps {
  statistics: Statistics;
}

export const StatisticsCard = memo<StatisticsCardProps>(({ statistics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <Boxes className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">产品总数</p>
            <p className="text-lg font-bold">{statistics.totalProducts}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <Package className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">总库存</p>
            <p className="text-lg font-bold">{statistics.totalStock}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <TrendingDown className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">总出库</p>
            <p className="text-lg font-bold">{statistics.totalOut}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">总入库</p>
            <p className="text-lg font-bold">{statistics.totalIn}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">库存预警</p>
            <p className="text-lg font-bold">{statistics.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <Wallet className="h-5 w-5 text-purple-600 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">总价值</p>
            <p className="text-lg font-bold">₽{Math.round(statistics.totalValue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

StatisticsCard.displayName = 'StatisticsCard';