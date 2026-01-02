// This file is created as requested.
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { NotificationBell } from '@/components/admin/notifications/NotificationBell';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  title, 
  subtitle, 
  actions 
}) => {
  useTranslations('Common');

  return (
    <div className='bg-white border-b border-gray-200 px-6 py-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>{title}</h1>
          {subtitle && (
            <p className='text-sm text-gray-600 mt-1'>{subtitle}</p>
          )}
        </div>
        
        <div className='flex items-center gap-4'>
          <NotificationBell />
        </div>
      </div>
      
      {/* Actions */}
      {actions && (
        <div className='mt-4'>
          {actions}
        </div>
      )}
    </div>
  );
};
