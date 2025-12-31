'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Card } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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
      router.push('/admin/dashboard');
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
          <p className='text-gray-600'>Admin Portal</p>
        </div>

        {/* Login Form */}
        <Card className='p-8'>
          <div className='mb-6'>
            <h2 className='text-2xl font-semibold text-gray-900 mb-2'>Welcome Back</h2>
            <p className='text-gray-600'>Sign in to your admin account</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Email Field */}
            <div>
              <Label htmlFor='email' className='text-sm font-medium text-gray-700'>
                Email Address
              </Label>
              <div className='mt-1 relative'>
                <Mail className='w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='pl-10'
                  placeholder='admin@smartrecruit.com'
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <Label htmlFor='password' className='text-sm font-medium text-gray-700'>
                Password
              </Label>
              <div className='mt-1 relative'>
                <Lock className='w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='pl-10 pr-10'
                  placeholder='Enter your password'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                >
                  {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className='flex items-center justify-between'>
              <div className='flex items-center'>
                <input
                  id='remember-me'
                  type='checkbox'
                  className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                />
                <label htmlFor='remember-me' className='ml-2 block text-sm text-gray-900'>
                  Remember me
                </label>
              </div>
              <a href='#' className='text-sm font-medium text-blue-600 hover:text-blue-500'>
                Forgot password?
              </a>
            </div>

            <Button
              type='submit'
              className='w-full'
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
