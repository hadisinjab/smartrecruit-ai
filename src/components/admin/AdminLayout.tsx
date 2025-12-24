'use client';

import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AlertTriangle } from 'lucide-react';
import { getCurrentUser } from '@/actions/auth';
import { AdminUser } from '@/types/admin';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions
}) => {
  const [user, setUser] = React.useState<AdminUser | null>(null);

  React.useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const isReadOnly = user?.role === 'reviewer';

  return (
    <div className='flex h-screen bg-gray-50'>
      {/* Sidebar */}
      <AdminSidebar user={user} />
      
      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Header */}
        <AdminHeader 
          title={title}
          subtitle={subtitle}
          actions={isReadOnly ? null : actions}
        />
        
        {/* Read-Only Warning */}
        {isReadOnly && (
          <div className='bg-yellow-50 border-b border-yellow-200 px-6 py-2'>
            <div className='flex items-center space-x-2'>
              <AlertTriangle className='w-4 h-4 text-yellow-600' />
              <span className='text-sm text-yellow-800'>
                You are viewing in read-only mode. Contact your administrator to make changes.
              </span>
            </div>
          </div>
        )}
        
        {/* Content */}
        <main className='flex-1 overflow-y-auto p-6'>
          {children}
        </main>
      </div>
    </div>
  );
};
