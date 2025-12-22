import { createClient } from '@/utils/supabase/server'

type Role = 'super-admin' | 'admin' | 'reviewer'

/**
 * Hierarchical role check. Super Admin inherits Admin permissions.
 */
export function canAccessRole(userRole: string | null | undefined, requiredRole?: Role | null) {
  if (!requiredRole) return true
  return userRole === requiredRole
}

/**
 * Returns the current authenticated user's role from the database.
 */
export async function getSessionRole(): Promise<Role | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !data?.role) return null
  return data.role as Role
}

/**
 * Ensures the current user is a Super Admin before allowing sensitive actions.
 */
export async function requireSuperAdmin() {
  const role = await getSessionRole()
  if (role !== 'super-admin') {
    throw new Error('Access denied: Super Admin only.')
  }
}

/**
 * Reviewer أو Admin أو Super Admin (كل الطاقم).
 */
export async function requireStaff(): Promise<Role> {
  const role = await getSessionRole()
  if (role !== 'reviewer' && role !== 'admin' && role !== 'super-admin') {
    throw new Error('Access denied: Staff only.')
  }
  return role
}

/**
 * Admin أو Super Admin.
 */
export async function requireAdminOrSuper(): Promise<Role> {
  const role = await getSessionRole()
  if (role !== 'admin' && role !== 'super-admin') {
    throw new Error('Access denied: Admin or Super Admin required.')
  }
  return role
}

/**
 * Ensures the current user is at least Reviewer (Reviewer, Admin, Super Admin).
 * Returns the resolved role for downstream checks.
 */
export async function requireReviewerOrAbove(): Promise<Role> {
  const role = await getSessionRole()
  if (role !== 'reviewer' && role !== 'admin') {
    throw new Error('Access denied: Reviewer or Admin required.')
  }
  return role
}

/**
 * Admin only (Super Admin مستثنى عمداً هنا).
 */
export async function requireAdmin(): Promise<Role> {
  const role = await getSessionRole()
  if (role !== 'admin') {
    throw new Error('Access denied: Admin required.')
  }
  return role
}

/**
 * Reviewer أو Admin (بدون Super Admin).
 */
export async function requireReviewerOrAdmin(): Promise<Role> {
  const role = await getSessionRole()
  if (role !== 'reviewer' && role !== 'admin') {
    throw new Error('Access denied: Reviewer or Admin required.')
  }
  return role
}

/**
 * Ensures the current user owns the job (created_by) or is Super Admin.
 */
export async function requireJobOwnerOrSuper(jobId: string) {
  const supabase = createClient()
  const role = await requireAdminOrSuper()

  if (role === 'super-admin') {
    return
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: job, error } = await supabase
    .from('job_forms')
    .select('created_by')
    .eq('id', jobId)
    .single()

  if (error || !job || job.created_by !== user.id) {
    throw new Error('Access denied: Job owner only.')
  }
}

