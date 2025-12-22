'use server'

import { createClient } from '@/utils/supabase/server'
import { AdminUser } from '@/types/admin'

export async function getCurrentUser(): Promise<AdminUser | null> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) return null

  // Fetch role from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    // Fallback if user record not found in users table but exists in auth
    return {
      id: user.id,
      name: user.email?.split('@')[0] || 'User',
      email: user.email || '',
      role: 'viewer', // Default safe role
      avatar: undefined,
      lastLogin: new Date().toISOString(),
      isActive: true,
      createdAt: user.created_at
    }
  }

  return {
    id: user.id,
    name: userData.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: userData.role || 'viewer',
    avatar: userData.avatar_url,
    lastLogin: new Date().toISOString(),
    isActive: true,
    createdAt: user.created_at
  }
}
