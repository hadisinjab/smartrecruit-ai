'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUsers, toggleUserStatus, updateUserRole } from '@/actions/users';
import { AdminUser } from '@/types/admin';
import { useToast } from '@/context/ToastContext';
import {
  Search,
  Plus,
  Shield,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
  Key,
  MoreVertical,
  User as UserIcon
} from 'lucide-react';
import { DataTable } from '@/components/admin/DataTable';
import type { Column } from '@/components/admin/DataTable';
import { useUser } from '@/context/UserContext';
import { useRouter } from '@/i18n/navigation';

export default function UsersPage() {
  const t = useTranslations('Users');
  const tTable = useTranslations('Table');
  const tCommon = useTranslations('Common');
  const tRole = useTranslations('Role');
  const format = useFormatter();
  const { addToast } = useToast();
  const { isSuperAdmin, isAdmin, isReviewer } = useUser();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      addToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) {
    return (
      <AdminLayout title={t('title')} subtitle={t('subtitle')}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p>{tCommon('loading') || 'Loading...'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserStatus(userId, currentStatus);
      addToast('success', 'User status updated successfully');
      loadUsers(); // Refresh list
    } catch (error) {
      addToast('error', 'Failed to update status');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserRole(userId, newRole);
      addToast('success', 'User role updated successfully');
      loadUsers(); // Refresh list
    } catch (error) {
      addToast('error', 'Failed to update role');
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'reviewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super-admin':
        return <ShieldCheck className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'reviewer':
        return <UserIcon className="w-4 h-4" />;
      default:
        return <ShieldX className="w-4 h-4" />;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      title: tTable('user'),
      render: (_, record) => (
        <div className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center'>
            <span className='text-white text-sm font-medium'>
              {record.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className='font-medium text-gray-900'>
              {record.name}
            </p>
            <p className='text-sm text-gray-500'>{record.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: tTable('role'),
      render: (_, record) => (
        <div className='flex items-center space-x-2'>
          {getRoleIcon(record.role)}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(record.role)}`}>
            {tRole(record.role)}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      title: tTable('status'),
      render: (_, record) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.isActive)}`}>
          {record.isActive ? (
            <>
              <UserCheck className="w-3 h-3 mr-1" />
              {t('filters.active')}
            </>
          ) : (
            <>
              <UserX className="w-3 h-3 mr-1" />
              {t('filters.inactive')}
            </>
          )}
        </span>
      )
    },
    {
      key: 'lastLogin',
      title: tTable('lastLogin'),
      render: (lastLogin) => {
        const loginDate = new Date(lastLogin);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60));
        
        let timeText = '';
        if (diffInHours < 1) {
          timeText = t('time.justNow');
        } else if (diffInHours < 24) {
          timeText = t('time.hoursAgo', { count: diffInHours });
        } else {
          const diffInDays = Math.floor(diffInHours / 24);
          timeText = t('time.daysAgo', { count: diffInDays });
        }
        
        return (
          <div className='text-sm text-gray-600'>
            <div>{loginDate.toLocaleDateString()}</div>
            <div className='text-xs text-gray-500'>{timeText}</div>
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      title: tTable('joined'),
      render: (createdAt) => (
        <div className='text-sm text-gray-600'>
          {new Date(createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      title: tTable('actions'),
      render: (_, record) => (
        <div className='flex items-center space-x-2'>
          {isSuperAdmin && (
            <Select
              value={record.role}
              onValueChange={(value) => handleRoleChange(record.id, value)}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super-admin">{tRole('super-admin')}</SelectItem>
                <SelectItem value="admin">{tRole('admin')}</SelectItem>
                <SelectItem value="reviewer">{tRole('reviewer')}</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button
            variant={record.isActive ? 'outline' : 'default'}
            size='sm'
            onClick={() => handleStatusToggle(record.id, record.isActive)}
            className='h-8'
          >
            {record.isActive ? (
              <>
                <UserX className="w-3 h-3 mr-1" />
                {t('actions.deactivate')}
              </>
            ) : (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                {t('actions.activate')}
              </>
            )}
          </Button>
          
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              console.log('Reset password for user:', record.id);
            }}
            className='h-8'
          >
            <Key className="w-3 h-3 mr-1" />
            {t('actions.reset')}
          </Button>
          
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
            <MoreVertical className='w-4 h-4' />
          </Button>
        </div>
      )
    }
  ];

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    superAdmins: users.filter(u => u.role === 'super-admin').length,
    admins: users.filter(u => u.role === 'admin').length,
    reviewers: users.filter(u => u.role === 'reviewer').length
  };

  if (isReviewer) {
    return (
      <AdminLayout
        title={t('title')}
        subtitle={t('subtitle')}
      >
        <div className='space-y-6'>
          <Card className='p-6'>
            <div className='space-y-4'>
              <h2 className='text-lg font-semibold text-gray-900'>
                {tCommon('profile') || 'Profile'}
              </h2>
              <p className='text-sm text-gray-600'>
                {tCommon('profileDescription') || 'Manage your personal information and preferences.'}
              </p>
            </div>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={t('title')}
      subtitle={t('count', { count: filteredUsers.length })}
      actions={
        isSuperAdmin || isAdmin ? (
          <Button 
            className='flex items-center space-x-2'
            onClick={() => router.push('/admin/users/new')}
          >
            <Plus className='w-4 h-4' />
            <span>{t('addUser')}</span>
          </Button>
        ) : null
      }
    >
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-gray-900'>{stats.total}</p>
              <p className='text-sm text-gray-600'>{t('stats.total')}</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.active}</p>
              <p className='text-sm text-gray-600'>{t('stats.active')}</p>
            </div>
          </Card>
          {isSuperAdmin && (
            <>
              <Card className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-purple-600'>{stats.superAdmins}</p>
                  <p className='text-sm text-gray-600'>{t('stats.superAdmins')}</p>
                </div>
              </Card>
              <Card className='p-4'>
                <div className='text-center'>
                  <p className='text-2xl font-bold text-blue-600'>{stats.admins}</p>
                  <p className='text-sm text-gray-600'>{t('stats.admins')}</p>
                </div>
              </Card>
            </>
          )}
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.reviewers}</p>
              <p className='text-sm text-gray-600'>{t('stats.reviewers')}</p>
            </div>
          </Card>
        </div>

        <Card className='p-4 bg-blue-50 border border-blue-200'>
          <div className='flex items-start space-x-3'>
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className='text-sm font-medium text-blue-900'>{t('permissions.title')}</h3>
              <div className='mt-2 text-sm text-blue-800'>
                <p><strong>{tRole('super-admin')}:</strong> {t('permissions.superAdminDesc')}</p>
                <p><strong>{tRole('admin')}:</strong> {t('permissions.adminDesc')}</p>
                <p><strong>{tRole('reviewer')}:</strong> {t('permissions.reviewerDesc')}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className='p-6'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder={t('filters.role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
                <SelectItem value="super-admin">{tRole('super-admin')}</SelectItem>
                <SelectItem value="admin">{tRole('admin')}</SelectItem>
                <SelectItem value="reviewer">{tRole('reviewer')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
                <SelectItem value="active">{t('filters.active')}</SelectItem>
                <SelectItem value="inactive">{t('filters.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Users Table */}
        <Card className='p-6'>
          <DataTable
            data={filteredUsers}
            columns={columns}
            emptyText={t('empty')}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
