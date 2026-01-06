import { createClient } from '@/utils/supabase/server'

export type Role = 'super-admin' | 'admin' | 'reviewer'

export interface SessionInfo {
  id: string
  role: Role
  organizationId: string | null
}

/**
 * Hierarchical role check. Super Admin inherits Admin permissions.
 */
export function canAccessRole(userRole: string | null | undefined, requiredRole?: Role | null) {
  if (!requiredRole) return true
  return userRole === requiredRole
}

export async function getSessionInfo(): Promise<SessionInfo | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log('[Authz] No user found in auth.getUser()');
    return null
  }

  // Use admin client to bypass RLS when checking roles
  // This is critical because normal RLS policies might prevent reading the user's own role
  // if the policy itself depends on reading the role (circular dependency) or is misconfigured.
  const admin = createClient() // Still use normal client, but rely on "users" table "select own profile" policy
  
  // Actually, let's use the admin/service role client if available in server context
  // But createClient() usually returns authenticated client. 
  // Let's assume standard RLS allows user to read their own profile.
  // If that fails, we have a bigger problem.
  
  const { data, error } = await supabase
    .from('users')
    .select('role, organization_id, is_active')
    .eq('id', user.id)
    .single()

  if (error) {
     console.error('[Authz] DB Error fetching user role:', error.message);
     // Fallback: try to see if role is in user metadata (less secure but good fallback)
     // const metaRole = user.user_metadata?.role;
     // if (metaRole) return { id: user.id, role: metaRole, organizationId: user.user_metadata?.organization_id };
     return null;
  }

  // console.log('[Authz] User:', user.id, 'DB Role:', data?.role);

  if (!data?.role) return null
  if (data.is_active === false) return null

  return {
    id: user.id,
    role: data.role as Role,
    organizationId: data.organization_id ?? null,
  }
}

/**
 * Returns the current authenticated user's role from the database.
 */
export async function getSessionRole(): Promise<Role | null> {
  const session = await getSessionInfo()
  return session?.role ?? null
}

/**
 * Ensures the current user is a Super Admin before allowing sensitive actions.
 */
export async function requireSuperAdmin(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'super-admin') {
    throw new Error('Access denied: Super Admin only.')
  }
  return session
}

/**
 * Reviewer or Admin or Super Admin (all staff).
 */
export async function requireStaff(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'reviewer' && session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Staff only.')
  }
  return session
}

/**
 * Admin or Super Admin.
 */
export async function requireAdminOrSuper(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Admin or Super Admin required.')
  }
  return session
}

/**
 * Ensures the current user is at least Reviewer (Reviewer, Admin, Super Admin).
 * Returns the resolved session for downstream checks.
 */
export async function requireReviewerOrAbove(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'reviewer' && session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Reviewer or above required.')
  }
  return session
}

/**
 * Admin only (Super Admin intentionally excluded here).
 */
export async function requireAdmin(): Promise<SessionInfo> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'admin') {
    throw new Error('Access denied: Admin required.')
  }
  return session
}

/**
 * Reviewer or Admin; Super Admin is permitted for convenience.
 */
export async function requireReviewerOrAdmin(): Promise<Role> {
  const session = await getSessionInfo()
  if (!session || (session.role !== 'reviewer' && session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Access denied: Reviewer or Admin required.')
  }
  return session.role
}

/**
 * Ensures the current user owns the job (created_by) or is Super Admin.
 */
export async function requireJobOwnerOrSuper(jobId: string) {
  const supabase = createClient()
  const session = await requireAdminOrSuper()

  if (session.role === 'super-admin') {
    return
  }

  const { data: job, error } = await supabase
    .from('job_forms')
    .select('created_by, organization_id')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    throw new Error('Access denied: Job not found.')
  }

  // Admins can manage any job inside their own organization.
  // This includes updating the Hiring Manager.
  if (session.role === 'admin') {
    // If the job has an organization, enforce same-organization.
    if (job.organization_id) {
      if (!session.organizationId || job.organization_id !== session.organizationId) {
        throw new Error('Access denied: Organization admin only.')
      }
      return
    }

    // Legacy jobs without organization_id: fall back to strict ownership.
    if (job.created_by === session.id) {
      return
    }
    throw new Error('Access denied: Job owner only.')
  }

  throw new Error('Access denied: Staff cannot manage jobs.')
}

