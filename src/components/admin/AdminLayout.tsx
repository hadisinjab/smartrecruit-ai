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
        
        {/* Content */}
        <main className='flex-1 overflow-y-auto p-6'>
          {children}
        </main>
      </div>
    </div>
  );
};
