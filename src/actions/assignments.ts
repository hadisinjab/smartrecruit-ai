'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdminOrSuper, requireStaff } from '@/utils/authz'
import { createAssignmentSchema } from '@/lib/validations/assignment'
import type { AssignmentResponse, CreateAssignmentInput } from '@/types/assignment'

type ActionOk<T> = { ok: true; status: number; data: T }
type ActionErr = { ok: false; status: number; error: string }
export type ActionResult<T> = ActionOk<T> | ActionErr

function toForbidden(message?: string): ActionErr {
  return { ok: false, status: 403, error: message || 'Forbidden' }
}

function toInternal(message?: string): ActionErr {
  return { ok: false, status: 500, error: message || 'Internal server error' }
}

function safeParseLinks(raw: string | null): string[] | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return null
    const urls = v.filter((x) => typeof x === 'string') as string[]
    return urls.length ? urls : []
  } catch {
    return null
  }
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

export async function createAssignment(input: CreateAssignmentInput): Promise<ActionResult<AssignmentResponse>> {
  try {
    // Authorization: Admin/Super Admin only
    await requireAdminOrSuper()

    const parsed = createAssignmentSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, status: 400, error: parsed.error.errors?.[0]?.message || 'Validation error' }
    }

    const appExistsErr = await assertApplicationExists(parsed.data.application_id)
    if (appExistsErr) return appExistsErr

    const linkJson =
      parsed.data.link_fields && parsed.data.link_fields.length
        ? JSON.stringify(parsed.data.link_fields)
        : null

    const supabase = createClient()
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        application_id: parsed.data.application_id,
        type: parsed.data.type,
        text_fields: parsed.data.text_fields ?? null,
        link_fields: linkJson,
      } as any)
      .select('id,application_id,type,text_fields,link_fields,created_at')
      .single()

    if (error || !data) {
      // RLS violations show up as PostgREST errors; map to 403
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error?.message || 'Internal server error' }
    }

    return {
      ok: true,
      status: 200,
      data: {
        id: data.id,
        application_id: data.application_id,
        type: data.type,
        text_fields: data.text_fields,
        link_fields: safeParseLinks(data.link_fields),
        created_at: data.created_at,
      } as any,
    }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

export async function getAssignmentsByApplication(applicationId: string): Promise<ActionResult<AssignmentResponse[]>> {
  try {
    await requireStaff()

    if (!applicationId) return { ok: false, status: 400, error: 'Validation error' }

    const appExistsErr = await assertApplicationExists(applicationId)
    if (appExistsErr) return appExistsErr

    const supabase = createClient()
    const { data, error } = await supabase
      .from('assignments')
      .select('id,application_id,type,text_fields,link_fields,created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true })

    if (error) {
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error.message || 'Internal server error' }
    }

    const mapped: AssignmentResponse[] = (data || []).map((row: any) => ({
      id: row.id,
      application_id: row.application_id,
      type: row.type,
      text_fields: row.text_fields,
      link_fields: safeParseLinks(row.link_fields),
      created_at: row.created_at,
    }))

    return { ok: true, status: 200, data: mapped }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

export async function getAssignmentById(assignmentId: string): Promise<ActionResult<AssignmentResponse>> {
  try {
    await requireStaff()
    if (!assignmentId) return { ok: false, status: 400, error: 'Validation error' }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('assignments')
      .select('id,application_id,type,text_fields,link_fields,created_at')
      .eq('id', assignmentId)
      .single()

    if (error || !data) {
      if ((error as any)?.code === 'PGRST116') return { ok: false, status: 404, error: 'Assignment not found' }
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error?.message || 'Internal server error' }
    }

    return {
      ok: true,
      status: 200,
      data: {
        id: data.id,
        application_id: data.application_id,
        type: data.type,
        text_fields: data.text_fields,
        link_fields: safeParseLinks(data.link_fields),
        created_at: data.created_at,
      } as any,
    }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

export async function deleteAssignment(assignmentId: string): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    // Authorization: Admin/Super Admin only
    await requireAdminOrSuper()
    if (!assignmentId) return { ok: false, status: 400, error: 'Validation error' }

    const supabase = createClient()

    // Soft validation: ensure exists
    const { data: exists } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', assignmentId)
      .single()

    if (!exists?.id) {
      return { ok: false, status: 404, error: 'Assignment not found' }
    }

    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
    if (error) {
      if ((error as any)?.code === '42501') return toForbidden()
      return { ok: false, status: 500, error: error.message || 'Internal server error' }
    }

    return { ok: true, status: 200, data: { deleted: true } }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}


