
'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { AdminUser } from '@/types/admin'
import { Database } from '@/types/supabase'
import { getSessionInfo, requireAdminOrSuper, requireSuperAdmin, requireReviewerOrAbove } from '@/utils/authz'
import { logAdminEvent } from '@/actions/activity'

type UserUpdate = Database['public']['Tables']['users']['Update']

interface CreateUserInput {
  fullName: string
  email: string
  password: string
  role: 'super-admin' | 'admin' | 'reviewer'
  organizationName: string
  isActive?: boolean
}

function assertAdminHasOrg(session: Awaited<ReturnType<typeof getSessionInfo>>) {
  if (!session) throw new Error('Access denied')
  if ((session.role === 'admin' || session.role === 'reviewer') && !session.organizationId) {
    throw new Error('Admin has no organization assigned')
  }
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
      // Admin/Reviewer without org should not manage anything.
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
  assertAdminHasOrg(session)

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

  await logAdminEvent({
    action: !currentStatus ? 'user.activate' : 'user.deactivate',
    entityType: 'user',
    entityId: userId,
    metadata: {
      is_active: !currentStatus,
    },
  })
}

export async function updateUserRole(userId: string, newRole: string) {
  await requireAdminOrSuper()
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session) {
    throw new Error('Access denied')
  }
  assertAdminHasOrg(session)

  // Check permissions
  if (session.role === 'admin') {
    // Admins can only update users in their org
    const { data: targetUser } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single()
    
    if (
      !targetUser || 
      targetUser.organization_id !== session.organizationId || 
      targetUser.role === 'super-admin'
    ) {
      throw new Error('Access denied')
    }

    // Admins can only manage reviewers (cannot change roles of admins).
    if (targetUser.role !== 'reviewer') {
      throw new Error('Access denied: Admins can only manage reviewers')
    }
    // Admins cannot change roles (reviewer stays reviewer).
    if (newRole !== 'reviewer') {
      throw new Error('Access denied: Admins cannot change user roles')
    }
  } else if (session.role !== 'super-admin') {
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

  await logAdminEvent({
    action: 'user.role_update',
    entityType: 'user',
    entityId: userId,
    metadata: {
      role: newRole,
    },
  })
}

export async function getUser(userId: string): Promise<AdminUser | null> {
  await requireAdminOrSuper()
  const adminSupabase = createAdminClient()
  const session = await getSessionInfo()
  
  if (!session) return null
  assertAdminHasOrg(session)

  const { data: rawUser, error } = await adminSupabase
    .from('users')
    .select('*, organizations(name)')
    .eq('id', userId)
    .single()

  if (error || !rawUser) {
    console.error('Error fetching user:', error)
    return null
  }

  const user = rawUser as any

  // Access check for Admins
  if (session.role === 'admin') {
    if (user.organization_id !== session.organizationId) {
      throw new Error('Access denied')
    }
    // Admins can only edit reviewers (they may view list, but edit access is restricted).
    if (user.role !== 'reviewer') {
      throw new Error('Access denied: Admins can only manage reviewers')
    }
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
  await requireAdminOrSuper()
  const adminClient = createAdminClient()
  const session = await getSessionInfo()
  
  if (!session) throw new Error('Access denied')
  assertAdminHasOrg(session)

  // Access check for Admins
  if (session.role === 'admin') {
    const { data: rawTargetUser } = await adminClient
      .from('users')
      .select('organization_id, role')
      .eq('id', userId)
      .single()
      
    const targetUser = rawTargetUser as any

    if (!targetUser || targetUser.organization_id !== session.organizationId) {
      throw new Error('Access denied')
    }
    
    // Admins cannot update super-admins
    if (targetUser.role === 'super-admin') {
      throw new Error('Access denied')
    }

    // Admins can only manage reviewers (not admins/super-admins).
    if (targetUser.role !== 'reviewer') {
      throw new Error('Access denied: Admins can only manage reviewers')
    }

    // Admins cannot change roles.
    if (input.role && input.role !== 'reviewer') {
      throw new Error('Access denied: Admins cannot change user roles')
    }
    

    // Admins cannot change organization
    if (input.organizationName) {
      // Allow if it's the same organization name (noop), but block changes
      // Ideally we just ignore it or throw error. Let's ignore it to be safe or throw.
      // Better to just not process organization update for admins.
    }
  }

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

  // 3. Handle organization update if name changed (Super Admin Only)
  let organizationId: string | undefined
  if (input.organizationName && session.role === 'super-admin') {
    const trimmedName = input.organizationName.trim()
    const { data: rawExistingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .ilike('name', trimmedName)
      .single()

    const existingOrg = rawExistingOrg as any

    if (existingOrg) {
      organizationId = existingOrg.id
    } else {
      const { data: rawNewOrg, error: createOrgError } = await adminClient
        .from('organizations')
        .insert({ name: trimmedName } as any)
        .select('id')
        .single()
      
      const newOrg = rawNewOrg as any

      if (createOrgError) return { error: 'Failed to create organization' }
      organizationId = newOrg.id
    }
  }

  // 4. Update public.users table
  const publicUpdate: UserUpdate = {}
  if (input.fullName) publicUpdate.full_name = input.fullName
  if (input.email) publicUpdate.email = input.email
  if (input.role) publicUpdate.role = input.role
  if (organizationId) publicUpdate.organization_id = organizationId
  if (typeof input.isActive === 'boolean') publicUpdate.is_active = input.isActive

  const { error: publicError } = await (adminClient.from('users') as any)
    .update(publicUpdate)
    .eq('id', userId)

  if (publicError) {
    console.error('Error updating public user:', publicError)
    return { error: publicError.message }
  }

  await logAdminEvent({
    action: 'user.update',
    entityType: 'user',
    entityId: userId,
    metadata: {
      updatedFields: Object.keys(publicUpdate),
      authFieldsUpdated: Object.keys(authUpdate),
    },
  })

  return { success: true }
}

export async function deleteUser(userId: string) {
  await requireAdminOrSuper()
  const adminClient = createAdminClient()
  const session = await getSessionInfo()

  if (!session) throw new Error('Access denied')
  assertAdminHasOrg(session)
  
  if (session.role === 'admin') {
    const { data: rawTargetUser } = await adminClient
      .from('users')
      .select('organization_id, role')
      .eq('id', userId)
      .single()
      
    const targetUser = rawTargetUser as any

    if (
      !targetUser || 
      targetUser.organization_id !== session.organizationId || 
      targetUser.role === 'super-admin'
    ) {
      throw new Error('Access denied')
    }

    if (targetUser.role !== 'reviewer') {
      throw new Error('Access denied: Admins can only manage reviewers')
    }
  }

  const { data: targetUserBeforeDelete } = await adminClient
    .from('users')
    .select('full_name,email,role')
    .eq('id', userId)
    .single()

  // Delete from Auth (which cascades to public.users because of the 'on delete cascade' foreign key)
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  
  if (error) {
    console.error('Error deleting user:', error)
    return { error: error.message }
  }

  await logAdminEvent({
    action: 'user.delete',
    entityType: 'user',
    entityId: userId,
    metadata: {
      name: (targetUserBeforeDelete as any)?.full_name ?? null,
      email: (targetUserBeforeDelete as any)?.email ?? null,
      role: (targetUserBeforeDelete as any)?.role ?? null,
    },
  })

  return { success: true }
}

export async function createUser(input: CreateUserInput) {
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session) {
    console.log('Session not found in createUser');
    return { error: 'Access denied: No session found' }
  }

  console.log('Creating user with role:', session.role);

  // Allow Super Admin AND Admin to create users
  if (session.role !== 'super-admin' && session.role !== 'admin') {
    return { error: `Access denied: Insufficient permissions (Role: ${session.role})` }
  }

  // If role is Admin, they can only create Reviewers
  if (session.role === 'admin') {
    if (input.role !== 'reviewer') {
      return { error: 'Access denied: Admins can only create Reviewers' }
    }
  }

  let organizationId: string

  // If Super Admin, handle organization logic as before
  if (session.role === 'super-admin') {
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
  } else {
    // If Admin, use their existing organization ID
    if (!session.organizationId) {
      return { error: 'Admin has no organization assigned' }
    }
    organizationId = session.organizationId
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
      is_active: typeof input.isActive === 'boolean' ? input.isActive : true,
    },
  })

  if (authError || !authData?.user) {
    console.error('Error creating auth user:', authError)
    return { error: authError?.message || 'Failed to create auth user' }
  }

  // Ensure public.users.is_active matches UI selection (trigger inserts row with default true).
  if (typeof input.isActive === 'boolean') {
    const { error: activeErr } = await (adminClient.from('users') as any)
      .update({ is_active: input.isActive })
      .eq('id', authData.user.id)

    if (activeErr) {
      console.error('Error setting is_active on public user:', activeErr)
      // Don't fail user creation for this; admin can toggle later.
    }
  }

  await logAdminEvent({
    action: 'user.create',
    entityType: 'user',
    entityId: authData.user.id,
    metadata: {
      email: input.email,
      role: input.role,
      fullName: input.fullName,
      organizationName: input.organizationName,
      is_active: typeof input.isActive === 'boolean' ? input.isActive : true,
    },
  })

  return { data: authData.user }
}
