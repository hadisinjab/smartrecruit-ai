// This file is created as requested.
'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/admin-card';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorClasses = {
  blue: 'text-blue-600 bg-blue-50',
  green: 'text-green-600 bg-green-50',
  yellow: 'text-yellow-600 bg-yellow-50',
  red: 'text-red-600 bg-red-50',
  purple: 'text-purple-600 bg-purple-50'
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color = 'blue'
}) => {
  const colorClass = colorClasses[color];
  
  return (
    <Card className='p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-medium text-gray-600'>{title}</p>
          <p className='text-2xl font-bold text-gray-900 mt-2'>{value}</p>
          {trend && (
            <div className='flex items-center mt-2'>
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className='text-xs text-gray-500 ms-1'>{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
          <Icon className='w-6 h-6' />
        </div>
      </div>
    </Card>
  );
};