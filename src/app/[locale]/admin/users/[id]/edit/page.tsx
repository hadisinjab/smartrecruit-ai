'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/context/ToastContext';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { getUser, updateUser } from '@/actions/users';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const userId = params.id;
  
  const tUsers = useTranslations('Users');
  const tCommon = useTranslations('Common');
  const tRole = useTranslations('Role');
  const router = useRouter();
  const { addToast } = useToast();
  const { isSuperAdmin } = useUser();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super-admin' | 'admin' | 'reviewer'>('reviewer');
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!isSuperAdmin) return;
      try {
        const user = await getUser(userId);
        if (user) {
          setFullName(user.name);
          setEmail(user.email);
          setRole(user.role);
          setOrganizationName(user.organizationName || '');
        } else {
          addToast('error', 'User not found');
          router.push('/admin/users');
        }
      } catch (error) {
        addToast('error', 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [userId, isSuperAdmin, router, addToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !organizationName) {
      addToast('error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateUser(userId, {
        fullName,
        email,
        password: password || undefined, // Only send if not empty
        role,
        organizationName,
      });

      if ('error' in result && result.error) {
        addToast('error', result.error);
        setIsSubmitting(false);
        return;
      }

      addToast('success', 'User updated successfully');
      router.push('/admin/users');
    } catch {
      addToast('error', 'Failed to update user');
      setIsSubmitting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout title={tUsers('title')} subtitle={tUsers('subtitle')}>
        <div className='space-y-6'>
          <Card className='p-6'>
            <p className='text-sm text-gray-600'>
              You do not have permission to edit users.
            </p>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title={tUsers('title')} subtitle={tUsers('subtitle')}>
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={tUsers('editUser') || 'Edit User'}
      subtitle={tUsers('subtitle')}
      actions={
        <Button
          variant='outline'
          className='flex items-center space-x-2'
          onClick={() => router.push('/admin/users')}
        >
          <ArrowLeft className='w-4 h-4' />
          <span>{tCommon('back') || 'Back to Users'}</span>
        </Button>
      }
    >
      <div className='max-w-3xl mx-auto'>
        <Card className='p-6'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Full Name</label>
                <Input
                  placeholder='Full name'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
                <Input
                  type='email'
                  placeholder='Email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Password (Leave empty to keep current)</label>
                <Input
                  type='password'
                  placeholder='New password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Role</label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as 'super-admin' | 'admin' | 'reviewer')}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={tUsers('filters.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='super-admin'>{tRole('super-admin')}</SelectItem>
                    <SelectItem value='admin'>{tRole('admin')}</SelectItem>
                    <SelectItem value='reviewer'>{tRole('reviewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Company Name</label>
                <Input
                  placeholder='Company name'
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>
            </div>

            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={isSubmitting}
                className='flex items-center space-x-2'
              >
                <Save className='w-4 h-4' />
                <span>{isSubmitting ? tCommon('loading') || 'Saving...' : tCommon('save')}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}

