'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { createNotification, getRecipientsForJob } from '@/lib/notifications'
import type { Database } from '@/types/supabase.types'

// Create typed Supabase client for this file
function createTypedClient() {
  const client = createClient()
  return client as any as ReturnType<typeof createClient> & {
    from: (table: keyof Database['public']['Tables']) => any
  }
}

function createTypedAdminClient() {
  const client = createAdminClient()
  return client as any as ReturnType<typeof createAdminClient> & {
    from: (table: keyof Database['public']['Tables']) => any
  }
}

type ApplyJob = {
  id: string
  title: string
  description: string | null
  // Optional fields (may exist depending on schema/migrations)
  department?: string | null
  location?: string | null
  type?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  requirements?: any
  benefits?: any
  deadline?: string | null
}

export type ApplyQuestion = {
  id: string
  type: 'text' | 'number' | 'textarea' | 'voice' | 'file' | 'url' | 'select'
  label: string
  required: boolean
  pageNumber?: number
  options?: (string | { label: string; value: string })[]
  placeholder?: string
}

function normalizeQuestionType(raw: string | null | undefined): ApplyQuestion['type'] {
  const t = (raw || '').toLowerCase()
  if (t === 'text' || t === 'short_text') return 'text'
  if (t === 'number') return 'number'
  if (t === 'textarea' || t === 'long_text') return 'textarea'
  if (t === 'voice' || t === 'audio' || t === 'voice_recording') return 'voice'
  if (t === 'file' || t === 'file_upload') return 'file'
  if (t === 'url' || t === 'link') return 'url'
  if (t === 'select' || t === 'dropdown' || t === 'multiple_choice') return 'select'
  return 'text'
}

export async function getJobForApplication(jobId: string): Promise<{
  job: (ApplyJob & {
    assignment_enabled?: boolean | null
    assignment_required?: boolean | null
    assignment_type?: 'text_only' | 'text_and_links' | null
    assignment_description?: string | null
    assignment_weight?: number | null
  }) | null
  questions: ApplyQuestion[]
  error: string | null
}> {
  try {
    const supabase = createTypedClient()

    // Public can only see active jobs due to RLS policy.
    const { data: job, error: jobError } = await supabase
      .from('job_forms')
      // Select all to keep compatibility across schema variants (some deployments add salary/requirements/etc.).
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return { job: null, questions: [], error: jobError?.message || 'Job not found' }
    }

    // If policy changes or staff sees non-active jobs, enforce active/deadline here for apply UX.
    if (job.status && job.status !== 'active') {
      return { job: null, questions: [], error: 'Job is not available for applications' }
    }
    if (job.deadline && new Date(job.deadline).getTime() <= Date.now()) {
      return { job: null, questions: [], error: 'The application deadline has passed' }
    }

    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id,type,label,required,page_number,config,order_index')
      .eq('job_form_id', jobId)
      .order('order_index', { ascending: true })

    if (qError) {
      return {
        job: { id: job.id, title: job.title, description: job.description },
        questions: [],
        error: qError.message || 'Failed to load questions'
      }
    }

    console.log('[getJobForApplication] Fetched questions:', JSON.stringify(questions, null, 2))

    const mapped: ApplyQuestion[] = (questions || []).map((q) => ({
      id: q.id,
      type: normalizeQuestionType(q.type),
      label: q.label,
      required: !!q.required,
      pageNumber: q.page_number ?? undefined,
      options: q.config?.options || undefined,
      placeholder: q.config?.placeholder || undefined
    }))

    return {
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        department: job.department ?? null,
        location: job.location ?? null,
        type: job.type ?? null,
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        salary_currency: job.salary_currency ?? null,
        requirements: job.requirements ?? null,
        benefits: job.benefits ?? null,
        deadline: job.deadline ?? null,
        assignment_enabled: job.assignment_enabled ?? false,
        assignment_required: job.assignment_required ?? false,
        assignment_type: job.assignment_type ?? null,
        assignment_description: job.assignment_description ?? null,
        assignment_weight: job.assignment_weight ?? null,
      },
      questions: mapped,
      error: null,
    }
  } catch (e: any) {
    return { job: null, questions: [], error: e?.message || 'Unexpected error' }
  }
}

export async function beginApplication(payload: {
  jobId: string
  candidateName?: string
  candidateEmail?: string
}): Promise<{ applicationId: string | null; error: string | null }> {
  try {
    // Use admin client to bypass RLS for application creation
    const supabase = createTypedAdminClient()
    // Always create a NEW application record.
    // But if candidateName OR candidateEmail matches a prior application for the same job,
    // mark it as duplicate so staff can see the repetition.
    const candidateEmail = String(payload.candidateEmail || '').trim()
    const candidateName = String(payload.candidateName || '').trim()
    const orParts: string[] = []
    if (candidateEmail) orParts.push(`candidate_email.ilike.${candidateEmail}`)
    if (candidateName) orParts.push(`candidate_name.ilike.${candidateName}`)

    let matchedBy: 'email' | 'name' | 'email_or_name' | null = null
    let matchedApplicationIds: string[] = []
    let isDuplicate = false

    if (orParts.length) {
      // Use admin client for duplicate checks (public anon client often can't SELECT due to RLS).
      const admin = createTypedAdminClient()
      const { data: existing } = await admin
        .from('applications')
        .select('id,submitted_at,candidate_email,candidate_name,created_at')
        .eq('job_form_id', payload.jobId)
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(50)

      const rows = existing || []
      if (rows.length) {
        isDuplicate = true
        matchedApplicationIds = rows.map((r) => r.id).filter(Boolean).slice(0, 25)
        const emailMatch = !!rows.find(
          (r) =>
            candidateEmail &&
            String(r.candidate_email || '').toLowerCase() === candidateEmail.toLowerCase()
        )
        const nameMatch = !!rows.find(
          (r) =>
            candidateName &&
            String(r.candidate_name || '').toLowerCase() === candidateName.toLowerCase()
        )
        matchedBy = emailMatch && nameMatch ? 'email_or_name' : emailMatch ? 'email' : 'name'
      }
    }

    const insertPayload = {
      job_form_id: payload.jobId,
      candidate_name: payload.candidateName || null,
      candidate_email: payload.candidateEmail || null,
      status: 'new',
      is_duplicate: isDuplicate,
      submitted_at: null
    }

    const { data: app, error } = await supabase
      .from('applications')
      .insert(insertPayload)
      .select('id')
      .single()
    
    if (error || !app?.id) {
      return { applicationId: null, error: error?.message || 'Failed to begin application' }
    }

    // Mark begin (best effort) so admins can see an application started even if user leaves early.
    await recordProgress(app.id, 'candidate', isDuplicate ? 'begin_duplicate' : 'begin', {
      candidateEmail: candidateEmail || null,
      candidateName: candidateName || null,
      duplicate: isDuplicate,
      matchedBy,
      matchedApplicationIds,
    }).catch(() => {})

    // NOTE: We intentionally do NOT notify on begin/start; notifications are reserved for final events.

    return { applicationId: app.id, error: null }
  } catch (e: any) {
    return { applicationId: null, error: e?.message || 'Unexpected error' }
  }
}

export async function saveProgress(payload: {
  applicationId: string
  answers: Array<{
    questionId: string
    value?: string | null
    voiceData?: any
  }>
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createTypedAdminClient()

    // Process answers sequentially to avoid race conditions
    for (const ans of payload.answers) {
      // Manual "Upsert": Try to find existing answer first
      // This avoids errors if the DB lacks a unique constraint on (application_id, question_id)
      const { data: existing } = await supabase
        .from('answers')
        .select('id')
        .eq('application_id', payload.applicationId)
        .eq('question_id', ans.questionId)
        .maybeSingle()

      let error = null

      if (existing) {
        // Update
        const { error: updErr } = await supabase
          .from('answers')
          .update({
            value: ans.value ?? null,
            voice_data: ans.voiceData ?? null
          })
          .eq('id', existing.id)
        error = updErr
      } else {
        // Insert
        const { error: insErr } = await supabase
          .from('answers')
          .insert({
            application_id: payload.applicationId,
            question_id: ans.questionId,
            value: ans.value ?? null,
            voice_data: ans.voiceData ?? null
          })
        error = insErr
      }

      if (error) console.error('Error saving answer:', error)
    }

    return { success: true, error: null }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to save progress' }
  }
}

export async function submitApplication(payload: {
  applicationId?: string | null
  jobId: string
  candidateName: string
  candidateEmail: string
  answers: Array<{
    questionId: string
    value?: string | null
    voiceData?: any
  }>
  resumeUrl?: string | null
}): Promise<{ applicationId: string | null; error: string | null }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createTypedAdminClient()

    const candidateEmail = String(payload.candidateEmail || '').trim()
    const candidateName = String(payload.candidateName || '').trim()

    // Look for existing applications by same email OR name for this job (ignore empty values)
    const orParts: string[] = []
    if (candidateEmail) orParts.push(`candidate_email.ilike.${candidateEmail}`)
    if (candidateName) orParts.push(`candidate_name.ilike.${candidateName}`)

    const { data: existingApps } = await (async () => {
      if (!orParts.length) return { data: [] }
      // Use admin client for duplicate checks (public anon client often can't SELECT due to RLS).
      const admin = createTypedAdminClient()
      return await admin
        .from('applications')
        .select('id,submitted_at,status,candidate_email,candidate_name,created_at')
        .eq('job_form_id', payload.jobId)
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(200)
    })()

    const excludeId = payload.applicationId || null
    const others = (existingApps || []).filter((a) => !excludeId || a.id !== excludeId)
    // Mark as duplicate if ANY prior application exists for the same email/name (submitted or not).
    const isDuplicateByHistory = others.length > 0

    let appId: string | null = null

    // Finalize the specific in-progress application if provided; otherwise fallback to creating a new one.
    if (payload.applicationId) {
      appId = payload.applicationId

      const isDuplicate = isDuplicateByHistory
      const status: 'new' | 'duplicate' = isDuplicate ? 'duplicate' : 'new'
      
      const updatePayload = {
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
        status,
        is_duplicate: isDuplicate,
        submitted_at: new Date().toISOString()
      }

      const { data: updated, error: updError } = await supabase
        .from('applications')
        .update(updatePayload)
        .eq('id', payload.applicationId)
        .select('id')
        .single()
        
      if (updError || !updated?.id) {
        return { applicationId: null, error: updError?.message || 'Failed to finalize application' }
      }
      appId = updated.id
    } else {
      // Insert new application (legacy fallback)
      const isDuplicate = isDuplicateByHistory
      const status: 'new' | 'duplicate' = isDuplicate ? 'duplicate' : 'new'

      const insertPayload = {
        job_form_id: payload.jobId,
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
        status,
        is_duplicate: isDuplicate,
        submitted_at: new Date().toISOString()
      }

      const { data: app, error: appError } = await supabase
        .from('applications')
        .insert(insertPayload)
        .select('id')
        .single()
        
      if (appError || !app?.id) {
        return { applicationId: null, error: appError?.message || 'Failed to create application' }
      }
      appId = app.id
    }

    if (!appId) {
      return { applicationId: null, error: 'Unexpected error: missing application id' }
    }

    // Persist final progress state (best effort).
    await recordProgress(appId, 'submitted', 'submit', {
      duplicate: isDuplicateByHistory,
      matchedBy: isDuplicateByHistory ? 'email_or_name' : null,
      matchedApplicationIds: others.map((o: any) => o.id).filter(Boolean).slice(0, 25),
    }).catch(() => {})

    if (payload.answers?.length) {
      const rows = payload.answers
        .filter((a) => a.questionId)
        .map((a) => ({
          application_id: appId,
          question_id: a.questionId,
          value: a.value ?? null,
          voice_data: a.voiceData ?? null
        }))

      // Manual "Upsert" for final submission as well
      for (const row of rows) {
        const { data: existing } = await supabase
          .from('answers')
          .select('id')
          .eq('application_id', row.application_id)
          .eq('question_id', row.question_id)
          .maybeSingle()

        if (existing && existing.id) {
          await supabase.from('answers').update(row).eq('id', existing.id)
        } else {
          await supabase.from('answers').insert(row)
        }
      }
    }

    if (payload.resumeUrl) {
      const { error: resumeError } = await supabase.from('resumes').insert({
        application_id: appId,
        file_url: payload.resumeUrl
      })

      if (resumeError) {
        return { applicationId: appId, error: resumeError.message || 'Failed to save resume' }
      }
    }

    // Notifications:
    // - application_completed (always)
    // - duplicate_application (if flagged)
    try {
      const { recipients, job } = await getRecipientsForJob(payload.jobId)
      const actionUrl = `/admin/candidates/${appId}`

      const baseMeta = {
        application_id: appId,
        candidate_name: payload.candidateName,
        job_id: payload.jobId,
        job_title: job?.title || null,
        action_url: actionUrl,
      }

      await Promise.all(
        recipients.map((userId) =>
          createNotification({
            user_id: userId,
            type: 'application_completed',
            title: 'Application completed',
            content: `${payload.candidateName} submitted an application for ${job?.title || 'a job'}.`,
            metadata: baseMeta,
          })
        )
      )

      const isDuplicate = isDuplicateByHistory
      if (isDuplicate) {
        await Promise.all(
          recipients.map((userId) =>
            createNotification({
              user_id: userId,
              type: 'duplicate_application',
              title: 'Duplicate application detected',
              content: `${payload.candidateName} submitted a duplicate application for ${job?.title || 'a job'}.`,
              metadata: baseMeta,
            })
          )
        )
      }
    } catch (e) {
      console.error('[notifications] submitApplication:', e)
    }

    return { applicationId: appId, error: null }
  } catch (e: any) {
    return { applicationId: null, error: e?.message || 'Unexpected error' }
  }
}

export async function recordProgress(
  applicationId: string,
  stepId: string,
  eventType: string = 'enter',
  meta: any = null
): Promise<{ error: string | null }> {
  try {
    const supabase = createTypedAdminClient()
    const now = new Date().toISOString()

    // Best effort: update last-progress fields on the application row (requires DB columns).
    // If the columns don't exist yet, this will error and we'll silently fall back to just touching updated_at.
    
    const progressUpdate = {
      updated_at: now,
      last_progress_step: stepId,
      last_progress_event: eventType,
      last_progress_at: now,
      last_progress_meta: meta
    }

    const upd = await supabase
      .from('applications')
      .update(progressUpdate)
      .eq('id', applicationId)

    if (upd.error) {
      // Fallback: at least touch updated_at for "recent activity" views.
      const fallbackUpdate = { updated_at: now }
      await supabase.from('applications').update(fallbackUpdate).eq('id', applicationId)
    }

    // Best effort: write a history event (requires table).
    const eventInsert = { application_id: applicationId, step_id: stepId, event_type: eventType, meta }
    try {
      await supabase
        .from('application_progress_events')
        .insert(eventInsert)
    } catch (e) {}

    return { error: null }
  } catch (e: any) {
    return { error: e?.message || 'Unexpected error' }
  }
}
