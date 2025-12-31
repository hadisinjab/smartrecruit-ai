'use server'

import { createClient } from '@/utils/supabase/server'
import { ActivityLogEntry } from '@/types/admin'
import { headers } from 'next/headers'
import { getSessionInfo, requireStaff } from '@/utils/authz'

export type AdminEntityType = ActivityLogEntry['targetType']

export async function logAdminEvent(input: {
  action: string
  entityType: AdminEntityType
  entityId?: string | null
  jobFormId?: string | null
  applicationId?: string | null
  metadata?: Record<string, any> | null
}) {
  try {
    const supabase = createClient()
    const session = await requireStaff()
    const h = headers()
    const ipAddress =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      null

    const userAgent = h.get('user-agent') || null

    const { error } = await supabase.from('active_log').insert({
      actor_id: session.id,
      actor_role: session.role,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      job_form_id: input.jobFormId ?? null,
      application_id: input.applicationId ?? null,
      metadata: input.metadata ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
    } as any)

    if (error) {
      console.error('[ActiveLog] Error inserting active log:', error)
    }
  } catch (e) {
    console.error('[ActiveLog] Failed to log admin event:', e)
  }
}

export async function getActivityLogs(filters?: {
  userId?: string;
  action?: string;
  targetType?: string;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  const supabase = createClient()
  const session = await requireStaff()
  
  let query = supabase
    .from('active_log')
    .select(`
      id,
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      job_form_id,
      application_id,
      metadata,
      ip_address,
      user_agent,
      created_at,
      actor:users!actor_id(full_name,email,role,organization_id),
      job_form:job_forms(title),
      application:applications(candidate_name,candidate_email)
    `)
    .order('created_at', { ascending: false })

  // Organization scoping:
  // - Super Admin sees all
  // - Admin/Reviewer only see their organization logs
  if (session.role !== 'super-admin' && session.organizationId) {
    query = query.eq('actor.organization_id', session.organizationId)
  }

  if (filters?.userId) {
    query = query.eq('actor_id', filters.userId)
  }

  if (filters?.action) {
    query = query.ilike('action', `%${filters.action}%`)
  }

  if (filters?.targetType) {
    query = query.eq('entity_type', filters.targetType)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }

  return (data || []).map((log: any) => {
    const actorName =
      log.actor?.full_name ||
      log.actor?.email ||
      'Unknown User'

    const rawType = String(log.entity_type || 'system')
    const allowedTypes: ActivityLogEntry['targetType'][] = ['candidate', 'job', 'user', 'evaluation', 'system']
    const targetType = (allowedTypes.includes(rawType as any) ? rawType : 'system') as ActivityLogEntry['targetType']

    const target =
      log.job_form?.title ||
      log.application?.candidate_name ||
      (log.entity_id ? `${log.entity_type}:${log.entity_id}` : String(log.entity_type || 'system'))

    const meta = log.metadata ?? {}
    // Keep description human-readable. Metadata is shown separately in the UI.
    const description = typeof meta?.description === 'string' ? meta.description : ''

    return {
      id: log.id,
      userId: log.actor_id,
      userName: actorName,
      userRole: log.actor_role || (log.actor?.role ?? 'user'),
      action: log.action,
      target,
      targetType,
      description,
      timestamp: log.created_at,
      entityId: log.entity_id ?? null,
      jobFormId: log.job_form_id ?? null,
      applicationId: log.application_id ?? null,
      metadata: log.metadata ?? null,
      ipAddress: log.ip_address ?? undefined,
      userAgent: log.user_agent ?? undefined,
    }
  })
}

export async function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
  const session = await getSessionInfo()
  await logAdminEvent({
    action: entry.action,
    entityType: entry.targetType,
    entityId: null,
    metadata: {
      description: entry.description,
      target: entry.target,
      userName: entry.userName,
      userRole: entry.userRole,
      ...(session ? {} : { note: 'no-session' }),
    },
  })
}
