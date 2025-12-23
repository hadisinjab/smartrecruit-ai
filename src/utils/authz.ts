import { createClient } from '@/utils/supabase/server'

export type Role = 'super-admin' | 'admin' | 'reviewer'

export interface SessionInfo {
  id: string
  role: Role
  organizationId: string | null
}

export function canAccessRole(userRole: string | null | undefined, requiredRole?: Role | null) {
  if (!requiredRole) return true
  return userRole === requiredRole
}

export async function getSessionInfo(): Promise<SessionInfo | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (error || !data?.role) return null

  return {
    id: user.id,
    role: data.role as Role,
    organizationId: data.organization_id ?? null,
  }
}

export async function requireSuperAdmin(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'super-admin') {
    throw new Error('Access denied: Super Admin only.')
  }
  return session
}

export async function requireStaff(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'reviewer' && session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Staff only.')
  }
  return session
}

export async function requireAdminOrSuper(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Admin or Super Admin required.')
  }
  return session
}

export async function requireReviewerOrAbove(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'reviewer' && session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Reviewer or above required.')
  }
  return session
}

export async function requireAdmin(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'admin') {
    throw new Error('Access denied: Admin required.')
  }
  return session
}

export async function requireReviewerOrAdmin(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'reviewer' && session.role !== 'admin')) {
    throw new Error('Access denied: Reviewer or Admin required.')
  }
  return session
}

export async function requireJobOwnerOrSuper(jobId: string) {
  const supabase = createClient()
  const session = await requireAdminOrSuper()

  if (session.role === 'super-admin') {
    return
  }

  const { data: job, error } = await supabase
    .from('job_forms')
    .select('created_by')
    .eq('id', jobId)
    .single()

  if (error || !job || job.created_by !== session.id) {
    throw new Error('Access denied: Job owner only.')
  }
}

