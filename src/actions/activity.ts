'use server'

import { createClient } from '@/utils/supabase/server'
import { ActivityLogEntry } from '@/types/admin'

export async function getActivityLogs(filters?: {
  userId?: string;
  action?: string;
  targetType?: string;
  limit?: number;
}): Promise<ActivityLogEntry[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('timestamp', { ascending: false })

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.action) {
    query = query.ilike('action', `%${filters.action}%`)
  }

  if (filters?.targetType) {
    query = query.eq('target_type', filters.targetType)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching activity logs:', error)
    return []
  }

  return data.map((log: any) => ({
    id: log.id,
    userId: log.user_id,
    userName: log.user_name || 'Unknown User',
    userRole: log.user_role || 'user',
    action: log.action,
    target: log.target,
    targetType: log.target_type,
    description: log.description,
    timestamp: log.timestamp,
    ipAddress: log.ip_address,
    userAgent: log.user_agent
  }))
}

export async function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: entry.userId,
      user_name: entry.userName,
      user_role: entry.userRole,
      action: entry.action,
      target: entry.target,
      target_type: entry.targetType,
      description: entry.description,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent
    })

  if (error) {
    console.error('Error logging activity:', error)
  }
}
