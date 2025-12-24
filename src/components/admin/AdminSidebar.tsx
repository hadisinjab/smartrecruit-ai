'use client';

import React from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  AlertCircle,
  UserCog,
  Activity,
  Clock
} from 'lucide-react';
import { AdminUser } from '@/types/admin';
import { createClient } from '@/utils/supabase/client';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}

type AllowedRole = 'super-admin' | 'admin' | 'reviewer';

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, href, isActive }) => {
  return (
    <Link href={href}>
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-50 text-blue-700 border-e-2 border-blue-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        )}
      >
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
};

export const AdminSidebar: React.FC<{ user: AdminUser | null }> = ({ user }) => {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('Sidebar');
  const tCommon = useTranslations('Common');

  const currentUser = user || ({ name: 'Guest', role: 'viewer' } as any);
  const userRole = (currentUser.role as AllowedRole) || 'reviewer';

  const getNavigationItems = () => {
    const allItems: Array<{
      icon: React.ReactNode;
      label: string;
      href: string;
      allowedRoles?: AllowedRole[];
      requiredRole?: AllowedRole | null;
    }> = [
      {
        icon: <LayoutDashboard className='w-5 h-5' />,
        label: t('dashboard'),
        href: '/admin/dashboard'
      },
      {
        icon: <Users className='w-5 h-5' />,
        label: t('candidates'),
        href: '/admin/candidates',
        allowedRoles: ['admin', 'reviewer', 'super-admin'] as const
      },
      {
        icon: <Briefcase className='w-5 h-5' />,
        label: t('jobs'),
        href: '/admin/jobs',
        allowedRoles: ['admin', 'super-admin'] as const
      },
      {
        icon: <Clock className='w-5 h-5' />,
        label: t('incomplete'),
        href: '/admin/incomplete',
        allowedRoles: ['admin', 'super-admin'] as const
      },
      {
        icon: <FileText className='w-5 h-5' />,
        label: t('evaluations'),
        href: '/admin/evaluations'
      },
      {
        icon: <UserCog className='w-5 h-5' />,
        label: t('userManagement'),
        href: '/admin/users'
      },
      {
        icon: <Activity className='w-5 h-5' />,
        label: t('activityLog'),
        href: '/admin/activity'
      },
      {
        icon: <BarChart3 className='w-5 h-5' />,
        label: t('reports'),
        href: '/admin/reports',
        allowedRoles: ['admin', 'super-admin'] as const
      },
      {
        icon: <Settings className='w-5 h-5' />,
        label: t('settings'),
        href: '/admin/settings',
        allowedRoles: ['super-admin'] as const
      }
    ];

    // Filter items based on user role
    return allItems.filter(item => {
      if (item.allowedRoles) {
        return item.allowedRoles.includes(userRole as AllowedRole);
      }
      if (item.requiredRole === null || item.requiredRole === undefined) return true;
      return item.requiredRole === userRole;
    });
  };

  const navigationItems = getNavigationItems();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'reviewer':
        return 'Reviewer';
      default:
        return 'User';
    }
  };

  return (
    <div className='w-64 bg-white border-r border-gray-200 h-full flex flex-col'>
      {/* Logo */}
      <div className='p-6 border-b border-gray-200'>
        <h1 className='text-xl font-bold text-gray-900'>SmartRecruit AI</h1>
        <p className='text-sm text-gray-600'>{tCommon('adminPanel')}</p>
      </div>

      {/* Navigation */}
      <nav className='flex-1 p-4 space-y-1'>
        {navigationItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      {/* User Section */}
      <div className='p-4 border-t border-gray-200'>
        <div className='flex items-center space-x-3 mb-3'>
          <div className='w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-medium'>
              {(currentUser?.name || 'Guest').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className='text-sm font-medium text-gray-900'>{currentUser.name}</p>
            <p className='text-xs text-gray-600'>{getRoleDisplayName(currentUser.role)}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className='flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors'
        >
          <LogOut className='w-5 h-5' />
          <span>{tCommon('logout')}</span>
        </button>
      </div>
    </div>
  );
};
