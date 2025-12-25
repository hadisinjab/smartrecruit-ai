'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/admin-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/context/ToastContext';
import { Plus, ArrowLeft } from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { createUser } from '@/actions/users';

export default function NewUserPage() {
  const tUsers = useTranslations('Users');
  const tCommon = useTranslations('Common');
  const tRole = useTranslations('Role');
  const router = useRouter();
  const { addToast } = useToast();
  const { isSuperAdmin, isAdmin } = useUser();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'super-admin' | 'admin' | 'reviewer'>('reviewer');
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !password) {
      addToast('error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createUser({
        fullName,
        email,
        password,
        role: selectedRole,
        organizationName,
      });

      if ('error' in result && result.error) {
        addToast('error', result.error);
        setIsSubmitting(false);
        return;
      }

      addToast('success', 'User created successfully');
      router.push('/admin/users');
    } catch {
      addToast('error', 'Failed to create user');
      setIsSubmitting(false);
    }
  };

  // Check permission: Only Super Admin and Admin can view this page
  if (!isSuperAdmin && !isAdmin) {
    return (
      <AdminLayout title={tUsers('title')} subtitle={tUsers('subtitle')}>
        <div className='space-y-6'>
          <Card className='p-6'>
            <p className='text-sm text-gray-600'>
              You do not have permission to create users.
            </p>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={tUsers('addUser')}
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
                <Input
                  placeholder='Full name'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
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
                <Input
                  type='password'
                  placeholder='Password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as 'super-admin' | 'admin' | 'reviewer')}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={tUsers('filters.role')} />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && (
                      <>
                        <SelectItem value='super-admin'>{tRole('super-admin')}</SelectItem>
                        <SelectItem value='admin'>{tRole('admin')}</SelectItem>
                      </>
                    )}
                    <SelectItem value='reviewer'>{tRole('reviewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isSuperAdmin && (
                <div>
                  <Input
                    placeholder='Company name'
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={isSubmitting}
                className='flex items-center space-x-2'
              >
                <Plus className='w-4 h-4' />
                <span>{isSubmitting ? tCommon('loading') || 'Creating...' : tCommon('save')}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
