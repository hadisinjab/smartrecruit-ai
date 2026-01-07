'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/context/UserContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations('Login');
  const supabase = createClient();
  const { refreshUser } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    console.log('Attempting login for:', email);

    try {
      // 1. Sign in with Supabase Auth
      console.log('Step 1: Calling signInWithPassword...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Step 1 Error:', authError);
        throw new Error(authError.message || 'Invalid email or password');
      }
      console.log('Step 1 Success:', authData);

      if (!authData.user) {
        throw new Error('No user returned from authentication');
      }

      // 2. Check if user exists in public.users and has appropriate role
      console.log('Step 2: Checking public.users table...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', authData.user.id)
        .single();
      
      console.log('Step 2 Result:', { userData, userError });

      if (userError || !userData) {
        console.error('Step 2 Error or No User Data:', userError);
        // If user not found in public table, sign them out immediately
        await supabase.auth.signOut();
        throw new Error('Access denied: User record not found.');
      }

      // 2b. Block inactive accounts
      if (userData.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('Account is inactive. Please contact your administrator.');
      }

      // 3. Verify Role
      console.log('Step 3: Verifying role:', userData.role);
      const allowedRoles = ['super-admin', 'admin', 'reviewer'];
      if (!allowedRoles.includes(userData.role)) {
        console.error('Step 3 Failed: Invalid role');
        await supabase.auth.signOut();
        throw new Error('Access denied: Unauthorized role.');
      }

      // 4. Redirect to Dashboard
      console.log('Step 4: Redirecting to dashboard...');
      await refreshUser().catch(() => {});
      router.replace('/admin/dashboard');
      router.refresh(); // Ensure server components re-fetch data
    } catch (err: any) {
      console.error('Login error caught:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        {/* Logo */}
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>SmartRecruit AI</h1>
          <p className='text-gray-600'>{t('adminPortal')}</p>
        </div>

        <Card className='p-8 shadow-xl border-0'>
          <div className='text-center mb-8'>
            <h2 className='text-2xl font-bold text-gray-900'>{t('welcomeBack')}</h2>
            <p className='text-gray-600'>{t('signInSubtitle')}</p>
          </div>

          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700'>
              <AlertCircle className='w-5 h-5 flex-shrink-0' />
              <p className='text-sm'>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label htmlFor='email'>{t('emailLabel')}</Label>
              <div className='relative'>
                <Mail className='absolute left-3 top-3 h-5 w-5 text-gray-400' />
                <Input
                  id='email'
                  type='email'
                  placeholder='admin@smartrecruit.com'
                  className='pl-10'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>{t('passwordLabel')}</Label>
              <div className='relative'>
                <Lock className='absolute left-3 top-3 h-5 w-5 text-gray-400' />
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  className='pl-10 pr-10'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-3 text-gray-400 hover:text-gray-600'
                >
                  {showPassword ? (
                    <EyeOff className='w-5 h-5' />
                  ) : (
                    <Eye className='w-5 h-5' />
                  )}
                </button>
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='remember'
                  className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <Label htmlFor='remember' className='cursor-pointer font-normal'>
                  {t('rememberMe')}
                </Label>
              </div>
              <a href='#' className='text-sm font-medium text-blue-600 hover:text-blue-500'>
                {t('forgotPassword')}
              </a>
            </div>

            <Button type='submit' className='w-full bg-blue-600 hover:bg-blue-700' disabled={isLoading}>
              {isLoading ? t('signingIn') : t('signInButton')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
