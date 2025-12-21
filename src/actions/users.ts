
'use server'

import { createClient } from '@/utils/supabase/server'
import { AdminUser } from '@/types/admin'

export async function getUsers(): Promise<AdminUser[]> {
  const supabase = createClient()
  
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  // Transform database users to AdminUser type
  return users.map((user: any) => ({
    id: user.id,
    name: user.name || 'Unknown',
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    lastLogin: user.last_sign_in_at || new Date().toISOString(), // Fallback if not tracked in this table
    createdAt: user.created_at
  }))
}

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('users')
    .update({ is_active: !currentStatus })
    .eq('id', userId)

  if (error) {
    console.error('Error toggling user status:', error)
    throw new Error('Failed to update user status')
  }
  
  // Revalidate is handled by the page component or we can add revalidatePath here if needed
}

export async function updateUserRole(userId: string, newRole: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user role:', error)
    throw new Error('Failed to update user role')
  }
}
