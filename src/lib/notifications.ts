'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import type { Database } from '@/types/supabase'
import type { NotificationType } from '@/types/notification'
import type { Json } from '@/types/supabase'

export interface CreateNotificationInput {
  user_id: string
  type: NotificationType
  title: string
  content: string
  metadata?: Json | null
}

export async function createNotification(input: CreateNotificationInput) {
  const admin = createAdminClient()
  const insertWithMetadata = async () =>
    await (admin.from('notifications') as any)
      .insert({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        content: input.content,
        is_read: false,
        metadata: input.metadata ?? null,
      })
      .select('*')
      .single()

  const insertWithoutMetadata = async () =>
    await (admin.from('notifications') as any)
      .insert({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        content: input.content,
        is_read: false,
      })
      .select('*')
      .single()

  const first = await insertWithMetadata()
  if (!first.error) return first.data

  const msg = String((first.error as any)?.message || '')
  const isMetadataMissing =
    msg.includes('notifications.metadata') ||
    msg.toLowerCase().includes("could not find the 'metadata' column") ||
    (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('metadata') && msg.toLowerCase().includes('does not exist'))

  if (isMetadataMissing) {
    const retry = await insertWithoutMetadata()
    if (!retry.error) return retry.data
    console.error('[notifications] createNotification retry error:', retry.error)
    throw new Error('Failed to create notification')
  }

  console.error('[notifications] createNotification error:', first.error)
  throw new Error('Failed to create notification')
}

export async function getRecipientsForJob(jobFormId: string) {
  const admin = createAdminClient()

  const { data: job, error: jobErr } = await admin
    .from('job_forms')
    .select('id,organization_id,created_by,title')
    .eq('id', jobFormId)
    .single() as any

  if (jobErr || !job?.id) {
    console.error('[notifications] getRecipientsForJob job lookup error:', jobErr)
    return { recipients: [] as string[], job: null as any }
  }

  // Super-admins (global)
  const { data: supers } = await admin.from('users').select('id').eq('role', 'super-admin')
  const superIds = (supers || []).map((u: any) => u.id)

  // Org staff
  let orgUserIds: string[] = []
  if (job.organization_id) {
    const { data: orgUsers } = await admin
      .from('users')
      .select('id,role')
      .eq('organization_id', job.organization_id)
      .in('role', ['admin', 'reviewer'])
    orgUserIds = (orgUsers || []).map((u: any) => u.id)
  } else if (job.created_by) {
    // Legacy mode: no org -> notify job owner only
    orgUserIds = [job.created_by]
  }

  const recipients = Array.from(new Set([...superIds, ...orgUserIds]))
  return { recipients, job }
}

export async function getRecipientsForApplication(applicationId: string) {
  const admin = createAdminClient()

  const { data: app, error: appErr } = await admin
    .from('applications')
    .select('id,candidate_name,job_form_id')
    .eq('id', applicationId)
    .single() as any

  if (appErr || !app?.id || !app.job_form_id) {
    console.error('[notifications] getRecipientsForApplication app lookup error:', appErr)
    return { recipients: [] as string[], app: null as any, job: null as any }
  }

  const { recipients, job } = await getRecipientsForJob(app.job_form_id)
  return { recipients, app, job }
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}


