'use client';

import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { useUser } from '@/context/UserContext';
import { useRouter } from '@/i18n/navigation';

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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { role, isLoading, user } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !role) {
      // Use window.location.href as fallback if router.push fails or is slow
      const loginPath = '/admin/login';
      router.push(loginPath);
      
      // Force reload if redirect doesn't happen quickly
      const timeout = setTimeout(() => {
         window.location.href = loginPath;
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, role, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return null; // Will redirect via useEffect
  }

  const isReadOnly = role === 'reviewer';

  return (
    <div className='flex h-screen bg-gray-50'>
      {/* Sidebar */}
      <AdminSidebar 
        user={user} 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* Header */}
        <AdminHeader 
          onMenuClick={() => setSidebarOpen(true)}
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
