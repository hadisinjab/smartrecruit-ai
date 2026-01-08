'use server'

import { createClient } from '@/utils/supabase/server'
import { requireStaff, requireSuperAdmin } from '@/utils/authz'

type ActionOk<T> = { ok: true; status: number; data: T }
type ActionErr = { ok: false; status: number; error: string }
export type ActionResult<T> = ActionOk<T> | ActionErr

function toForbidden(message?: string): ActionErr {
  return { ok: false, status: 403, error: message || 'Forbidden' }
}

function toInternal(message?: string): ActionErr {
  return { ok: false, status: 500, error: message || 'Internal server error' }
}

export async function getUnreadNotificationsCount(opts?: { scope?: 'me' | 'all' }): Promise<ActionResult<{ count: number }>> {
  try {
    const scope = opts?.scope || 'me'
    const supabase = createClient()

    if (scope === 'all') {
      await requireSuperAdmin()
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
      if (error) return { ok: false, status: 500, error: error.message || 'Failed to fetch count' }
      return { ok: true, status: 200, data: { count: count || 0 } }
    }

    await requireStaff()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) return { ok: false, status: 500, error: error.message || 'Failed to fetch count' }
    return { ok: true, status: 200, data: { count: count || 0 } }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

export async function getNotifications(opts?: {
  scope?: 'me' | 'all'
  type?: string
  unreadOnly?: boolean
  limit?: number
}): Promise<ActionResult<any[]>> {
  try {
    const scope = opts?.scope || 'me'
    const limit = Math.max(1, Math.min(100, opts?.limit ?? 20))
    const supabase = createClient()

    const runQuery = async (selectCols: string) => {
      let query = supabase
        .from('notifications')
        .select(selectCols)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (opts?.type) query = query.eq('type', opts.type)
      if (opts?.unreadOnly) query = query.eq('is_read', false)

      if (scope === 'all') {
        await requireSuperAdmin()
      } else {
        await requireStaff()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Access denied')
        query = query.eq('user_id', user.id)
      }

      return (await query) as any
    }

    // Prefer selecting metadata, but fall back gracefully if DB schema hasn't been migrated yet.
    const { data, error } = await runQuery('id,user_id,type,title,content,is_read,metadata,created_at')
    if (!error) return { ok: true, status: 200, data: data || [] }

    const msg = String((error as any)?.message || '')
    const isMetadataMissing =
      msg.includes('notifications.metadata') ||
      msg.toLowerCase().includes("could not find the 'metadata' column") ||
      msg.toLowerCase().includes('column') && msg.toLowerCase().includes('metadata') && msg.toLowerCase().includes('does not exist')

    if (isMetadataMissing) {
      const retry = await runQuery('id,user_id,type,title,content,is_read,created_at') as any
      if (retry.error) return { ok: false, status: 500, error: (retry.error as any).message || retry.error || 'Failed to fetch notifications' }
      return { ok: true, status: 200, data: retry.data || [] }
    }

    return { ok: false, status: 500, error: msg || 'Failed to fetch notifications' }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult<{ updated: boolean }>> {
  try {
    await requireStaff()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

    // RLS + column privileges enforce safety; we also scope to user_id
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) return { ok: false, status: 500, error: error.message || 'Failed to update notification' }
    return { ok: true, status: 200, data: { updated: true } }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult<{ updated: boolean }>> {
  try {
    await requireStaff()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) return { ok: false, status: 500, error: error.message || 'Failed to update notifications' }
    return { ok: true, status: 200, data: { updated: true } }
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.toLowerCase().includes('access denied')) return toForbidden()
    return toInternal()
  }
}


