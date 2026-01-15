// This file is created as requested.
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { NotificationBell } from '@/components/admin/notifications/NotificationBell';

import { Menu } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuClick: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  title, 
  subtitle, 
  actions, 
  onMenuClick 
}) => {
  useTranslations('Common');

  return (
    <div className='bg-white border-b border-gray-200 px-4 sm:px-6 py-4'>
      <div className='flex items-center justify-between'>
        <div className="flex items-center">
          <button 
            onClick={onMenuClick}
            className="md:hidden mr-4 text-gray-500 hover:text-gray-700"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>{title}</h1>
            {subtitle && (
              <p className='text-sm text-gray-600 mt-1 hidden sm:block'>{subtitle}</p>
            )}
          </div>
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
