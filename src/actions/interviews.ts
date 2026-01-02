'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdminOrSuper, requireStaff } from '@/utils/authz'
import { createInterviewSchema } from '@/lib/validations/interview'
import type { CreateInterviewInput, Interview } from '@/types/interview'
import { createNotification, getRecipientsForApplication } from '@/lib/notifications'

type ActionOk<T> = { ok: true; status: number; data: T }
type ActionErr = { ok: false; status: number; error: string }
export type ActionResult<T> = ActionOk<T> | ActionErr

function toForbidden(message?: string): ActionErr {
  return { ok: false, status: 403, error: message || 'Forbidden' }
}

function toInternal(message?: string): ActionErr {
  return { ok: false, status: 500, error: message || 'Internal server error' }
}

async function assertApplicationExists(applicationId: string): Promise<ActionErr | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .single()

  if (error || !data?.id) {
    return { ok: false, status: 404, error: 'Application not found' }
  }
  return null
}

/**
 * Create a new interview recording (Admin/Super Admin only)
 */
export async function createInterview(input: CreateInterviewInput): Promise<ActionResult<Interview>> {
  try {
    await requireAdminOrSuper()

    const parsed = createInterviewSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, status: 400, error: parsed.error.errors?.[0]?.message || 'Validation error' }
    }

    const appExistsErr = await assertApplicationExists(parsed.data.application_id)
    if (appExistsErr) return appExistsErr

    const supabase = createClient()
    const { data, error } = await supabase
      .from('interviews')
      .insert({
        application_id: parsed.data.application_id,
        audio_or_video_url: parsed.data.audio_or_video_url,
        audio_analysis: null,
      } as any)
      .select('id,application_id,audio_or_video_url,audio_analysis,created_at')
      .single()

    if (error || !data) {
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error?.message || 'Failed to create interview' }
    }

    // NOTE: We intentionally do NOT notify on interview uploads to avoid noisy notifications.

    revalidatePath(`/admin/candidates/${parsed.data.application_id}`)
    return { ok: true, status: 200, data: data as Interview }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

/**
 * Get all interviews for an application (Staff)
 */
export async function getInterviewsByApplication(applicationId: string): Promise<ActionResult<Interview[]>> {
  try {
    await requireStaff()
    if (!applicationId) return { ok: false, status: 400, error: 'Validation error' }

    const appExistsErr = await assertApplicationExists(applicationId)
    if (appExistsErr) return appExistsErr

    const supabase = createClient()
    const { data, error } = await supabase
      .from('interviews')
      .select('id,application_id,audio_or_video_url,audio_analysis,created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) {
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error.message || 'Failed to fetch interviews' }
    }

    return { ok: true, status: 200, data: (data || []) as Interview[] }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

/**
 * Get a single interview by ID (Staff)
 */
export async function getInterviewById(interviewId: string): Promise<ActionResult<Interview>> {
  try {
    await requireStaff()
    if (!interviewId) return { ok: false, status: 400, error: 'Validation error' }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('interviews')
      .select('id,application_id,audio_or_video_url,audio_analysis,created_at')
      .eq('id', interviewId)
      .single()

    if (error || !data) {
      if ((error as any)?.code === 'PGRST116') return { ok: false, status: 404, error: 'Interview not found' }
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error?.message || 'Failed to fetch interview' }
    }

    return { ok: true, status: 200, data: data as Interview }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

/**
 * Delete an interview (Admin/Super Admin only)
 */
export async function deleteInterview(interviewId: string): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    await requireAdminOrSuper()
    if (!interviewId) return { ok: false, status: 400, error: 'Validation error' }

    const supabase = createClient()

    const { data: row } = await supabase
      .from('interviews')
      .select('id,application_id')
      .eq('id', interviewId)
      .single()

    if (!row?.id) {
      return { ok: false, status: 404, error: 'Interview not found' }
    }

    const { error } = await supabase.from('interviews').delete().eq('id', interviewId)
    if (error) {
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error.message || 'Failed to delete interview' }
    }

    revalidatePath(`/admin/candidates/${row.application_id}`)
    return { ok: true, status: 200, data: { deleted: true } }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

/**
 * Trigger AI analysis for an interview (Placeholder)
 */
export async function triggerInterviewAnalysis(interviewId: string): Promise<ActionResult<{ queued: boolean; message: string }>> {
  try {
    await requireAdminOrSuper()
    if (!interviewId) return { ok: false, status: 400, error: 'Validation error' }

    // TODO: Implement AI analysis pipeline
    return { ok: true, status: 200, data: { queued: true, message: 'AI analysis queued (feature coming soon)' } }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}


