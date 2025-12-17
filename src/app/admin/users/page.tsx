'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAdminUsers } from '@/data/mockData';
import { AdminUser } from '@/types/admin';
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
import { DataTable, Column } from '@/components/admin/DataTable';

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const users = getAdminUsers();

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
      title: 'User',
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
      title: 'Role',
      render: (_, record) => (
        <div className='flex items-center space-x-2'>
          {getRoleIcon(record.role)}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(record.role)}`}>
            {record.role.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, record) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.isActive)}`}>
          {record.isActive ? (
            <>
              <UserCheck className="w-3 h-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <UserX className="w-3 h-3 mr-1" />
              Inactive
            </>
          )}
        </span>
      )
    },
    {
      key: 'lastLogin',
      title: 'Last Login',
      render: (lastLogin) => {
        const loginDate = new Date(lastLogin);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60));
        
        let timeText = '';
        if (diffInHours < 1) {
          timeText = 'Just now';
        } else if (diffInHours < 24) {
          timeText = `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        } else {
          const diffInDays = Math.floor(diffInHours / 24);
          timeText = `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
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
      title: 'Joined',
      render: (createdAt) => (
        <div className='text-sm text-gray-600'>
          {new Date(createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, record) => (
        <div className='flex items-center space-x-2'>
          <Select
            value={record.role}
            onValueChange={(value) => {
              console.log('Change role to:', value, 'for user:', record.id);
              // In a real app, this would call an API
            }}
          >
            <SelectTrigger className="w-[130px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super-admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant={record.isActive ? 'outline' : 'default'}
            size='sm'
            onClick={() => {
              console.log(record.isActive ? 'Deactivate' : 'Activate', 'user:', record.id);
              // In a real app, this would call an API
            }}
            className='h-8'
          >
            {record.isActive ? (
              <>
                <UserX className="w-3 h-3 mr-1" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="w-3 h-3 mr-1" />
                Activate
              </>
            )}
          </Button>
          
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              console.log('Reset password for user:', record.id);
              // In a real app, this would call an API
            }}
            className='h-8'
          >
            <Key className="w-3 h-3 mr-1" />
            Reset
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

  return (
    <AdminLayout
      title="User Management"
      subtitle={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
      actions={
        <Button className='flex items-center space-x-2'>
          <Plus className='w-4 h-4' />
          <span>Add User</span>
        </Button>
      }
    >
      <div className='space-y-6'>
        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-gray-900'>{stats.total}</p>
              <p className='text-sm text-gray-600'>Total Users</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.active}</p>
              <p className='text-sm text-gray-600'>Active</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-purple-600'>{stats.superAdmins}</p>
              <p className='text-sm text-gray-600'>Super Admins</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-blue-600'>{stats.admins}</p>
              <p className='text-sm text-gray-600'>Admins</p>
            </div>
          </Card>
          <Card className='p-4'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-600'>{stats.reviewers}</p>
              <p className='text-sm text-gray-600'>Reviewers</p>
            </div>
          </Card>
        </div>

        {/* Permission Notice */}
        <Card className='p-4 bg-blue-50 border border-blue-200'>
          <div className='flex items-start space-x-3'>
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className='text-sm font-medium text-blue-900'>Permission Levels</h3>
              <div className='mt-2 text-sm text-blue-800'>
                <p><strong>Super Admin:</strong> Full access to all features including user management</p>
                <p><strong>Admin:</strong> Access to candidates, jobs, and evaluations</p>
                <p><strong>Reviewer:</strong> Read-only access to candidates and evaluations</p>
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10'
                />
              </div>
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super-admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full sm:w-[150px]'>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Users Table */}
        <Card className='p-6'>
          <DataTable
            data={filteredUsers}
            columns={columns}
            emptyText="No users found"
          />
        </Card>
      </div>
    </AdminLayout>
  );
}