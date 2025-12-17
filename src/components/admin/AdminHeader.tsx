// This file is created as requested.
'use client';

import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  return (
    <div className='bg-white border-b border-gray-200 px-6 py-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>{title}</h1>
          {subtitle && (
            <p className='text-sm text-gray-600 mt-1'>{subtitle}</p>
          )}
        </div>
        
        <div className='flex items-center space-x-4'>
          {/* Search */}
          <div className='relative'>
            <Search className='w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              placeholder='Search...'
              className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
          
          {/* Notifications */}
          <Button variant='ghost' size='icon' className='relative'>
            <Bell className='w-5 h-5' />
            <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full'></span>
          </Button>
          
          {/* User Menu */}
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