import type { Json } from '@/types/supabase'

export type NotificationType =
  | 'new_application'
  | 'application_completed'
  | 'incomplete_application'
  | 'duplicate_application'
  | 'ai_evaluation_ready'
  | 'interview_scheduled'
  | 'interview_uploaded'
  | 'interview_analysis_ready'
  | 'assignment_submitted'
  | 'status_changed'
  | 'reminder'

export type NotificationPriority = 'high' | 'medium' | 'normal'

export type NotificationMetadata = Json & {
  application_id?: string
  candidate_name?: string
  job_id?: string
  job_title?: string
  action_url?: string
}

export interface NotificationRow {
  id: string
  user_id: string | null
  type: string | null
  title: string | null
  content: string | null
  is_read: boolean
  metadata?: NotificationMetadata | null
  created_at: string
}





