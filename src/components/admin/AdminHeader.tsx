// This file is created as requested.
'use client';

import React from 'react';
import { Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useSearch } from '@/context/SearchContext';
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
  const t = useTranslations('Common');
  const { searchTerm, setSearchTerm } = useSearch();

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
          <div className='relative'>
            <Search className='w-4 h-4 absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              placeholder={t('search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='ps-10 pe-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          
          <NotificationBell />
          
          <Button variant='ghost' size='icon'>
            <User className='w-5 h-5' />
          </Button>
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
