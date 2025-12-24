
'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { AdminUser } from '@/types/admin'
import { getSessionInfo, requireAdminOrSuper, requireSuperAdmin, requireReviewerOrAbove } from '@/utils/authz'

interface CreateUserInput {
  fullName: string
  email: string
  password: string
  role: 'super-admin' | 'admin' | 'reviewer'
  organizationName: string
}

export async function getUsers(): Promise<AdminUser[]> {
  await requireReviewerOrAbove()
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session) {
    return []
  }

  let query = supabase
    .from('users')
    .select('*, organizations(name)')
    .order('created_at', { ascending: false })

  // فلترة إضافية في الكود للتأكيد (زيادة أمان)
  if (session.role === 'admin' || session.role === 'reviewer') {
    if (!session.organizationId) {
      return []
    }
    query = query.eq('organization_id', session.organizationId)
    
    // المراجع يرى فقط المراجعين (Reviewers) في شركته
    if (session.role === 'reviewer') {
      query = query.eq('role', 'reviewer')
    }
  }

  const { data: users, error } = await query

  if (error || !users) {
    console.error('Error fetching users:', error)
    return []
  }

  return users.map((user: any) => ({
    id: user.id,
    name: user.name || user.full_name || 'Unknown',
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    lastLogin: user.last_sign_in_at || new Date().toISOString(),
    createdAt: user.created_at,
    organizationName: user.organizations?.name || 'N/A'
  }))
}

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
  await requireAdminOrSuper()
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session) {
    throw new Error('Access denied')
  }

  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', userId)
    .single()

  if (fetchError || !targetUser) {
    throw new Error('User not found')
  }

  if (session.role === 'super-admin') {
  } else if (session.role === 'admin') {
    if (
      targetUser.role !== 'reviewer' ||
      !session.organizationId ||
      targetUser.organization_id !== session.organizationId
    ) {
      throw new Error('Access denied')
    }
  } else {
    throw new Error('Access denied')
  }
  
  const { error } = await supabase
    .from('users')
    .update({ is_active: !currentStatus })
    .eq('id', userId)

  if (error) {
    console.error('Error toggling user status:', error)
    throw new Error('Failed to update user status')
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  await requireSuperAdmin()
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session || session.role !== 'super-admin') {
    throw new Error('Access denied')
  }
  
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user role:', error)
    throw new Error('Failed to update user role')
  }
}

export async function getUser(userId: string): Promise<AdminUser | null> {
  await requireSuperAdmin()
  const adminSupabase = createAdminClient()
  
  const { data: user, error } = await adminSupabase
    .from('users')
    .select('*, organizations(name)')
    .eq('id', userId)
    .single()

  if (error || !user) {
    console.error('Error fetching user:', error)
    return null
  }

  return {
    id: user.id,
    name: user.full_name || 'Unknown',
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    lastLogin: user.last_sign_in_at || new Date().toISOString(),
    createdAt: user.created_at,
    organizationName: user.organizations?.name || 'N/A'
  }
}

export async function updateUser(userId: string, input: Partial<CreateUserInput>) {
  await requireSuperAdmin()
  const adminClient = createAdminClient()
  
  // 1. Update Auth user (email and password if provided)
  const authUpdate: any = {}
  if (input.email) authUpdate.email = input.email
  if (input.password) authUpdate.password = input.password
  
  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate)
    if (authError) {
      console.error('Error updating auth user:', authError)
      return { error: authError.message }
    }
  }

  // 2. Update metadata in auth if needed
  if (input.fullName || input.role) {
    const { error: metaError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: input.fullName,
        role: input.role
      }
    })
    if (metaError) {
      console.error('Error updating auth metadata:', metaError)
    }
  }

  // 3. Handle organization update if name changed
  let organizationId: string | undefined
  if (input.organizationName) {
    const trimmedName = input.organizationName.trim()
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .ilike('name', trimmedName)
      .single()

    if (existingOrg) {
      organizationId = existingOrg.id
    } else {
      const { data: newOrg, error: createOrgError } = await adminClient
        .from('organizations')
        .insert({ name: trimmedName })
        .select('id')
        .single()
      
      if (createOrgError) return { error: 'Failed to create organization' }
      organizationId = newOrg.id
    }
  }

  // 4. Update public.users table
  const publicUpdate: any = {}
  if (input.fullName) publicUpdate.full_name = input.fullName
  if (input.email) publicUpdate.email = input.email
  if (input.role) publicUpdate.role = input.role
  if (organizationId) publicUpdate.organization_id = organizationId

  const { error: publicError } = await adminClient
    .from('users')
    .update(publicUpdate)
    .eq('id', userId)

  if (publicError) {
    console.error('Error updating public user:', publicError)
    return { error: publicError.message }
  }

  return { success: true }
}

export async function deleteUser(userId: string) {
  await requireSuperAdmin()
  const adminClient = createAdminClient()
  
  // Delete from Auth (which cascades to public.users because of the 'on delete cascade' foreign key)
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  
  if (error) {
    console.error('Error deleting user:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function createUser(input: CreateUserInput) {
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session || session.role !== 'super-admin') {
    return { error: 'Access denied' }
  }

  const trimmedName = input.organizationName.trim()
  if (!trimmedName) {
    return { error: 'Organization name is required' }
  }

  const { data: existingOrgs, error: orgSearchError } = await supabase
    .from('organizations')
    .select('id, name')
    .ilike('name', trimmedName)
    .limit(1)

  if (orgSearchError) {
    console.error('Error searching organizations:', orgSearchError)
    return { error: orgSearchError.message || 'Failed to find organization' }
  }

  let organizationId: string

  if (existingOrgs && existingOrgs.length > 0) {
    organizationId = existingOrgs[0].id
  } else {
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: trimmedName,
      })
      .select('id')
      .single()

    if (createOrgError || !newOrg) {
      console.error('Error creating organization:', createOrgError)
      return { error: createOrgError?.message || 'Failed to create organization' }
    }

    organizationId = newOrg.id
  }

  let adminClient
  try {
    adminClient = createAdminClient()
  } catch (e) {
    console.error('Error creating Supabase admin client:', e)
    return { error: 'Server configuration error: unable to create auth client' }
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName,
      role: input.role,
      organization_id: organizationId,
    },
  })

  if (authError || !authData?.user) {
    console.error('Error creating auth user:', authError)
    return { error: authError?.message || 'Failed to create auth user' }
  }

  return { data: authData.user }
}
