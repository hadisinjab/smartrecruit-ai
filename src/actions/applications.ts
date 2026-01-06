'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { createNotification, getRecipientsForJob } from '@/lib/notifications'

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
    const supabase = createClient()

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
    if ((job as any).status && (job as any).status !== 'active') {
      return { job: null, questions: [], error: 'Job is not available for applications' }
    }
    if ((job as any).deadline && new Date((job as any).deadline).getTime() <= Date.now()) {
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

    const mapped: ApplyQuestion[] = (questions || []).map((q: any) => ({
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
        department: (job as any).department ?? null,
        location: (job as any).location ?? null,
        type: (job as any).type ?? null,
        salary_min: (job as any).salary_min ?? null,
        salary_max: (job as any).salary_max ?? null,
        salary_currency: (job as any).salary_currency ?? null,
        requirements: (job as any).requirements ?? null,
        benefits: (job as any).benefits ?? null,
        deadline: (job as any).deadline ?? null,
        assignment_enabled: (job as any).assignment_enabled ?? false,
        assignment_required: (job as any).assignment_required ?? false,
        assignment_type: (job as any).assignment_type ?? null,
        assignment_description: (job as any).assignment_description ?? null,
        assignment_weight: (job as any).assignment_weight ?? null,
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
    const supabase = createAdminClient()
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
      const admin = createAdminClient()
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
        matchedApplicationIds = rows.map((r: any) => r.id).filter(Boolean).slice(0, 25)
        const emailMatch = !!rows.find(
          (r: any) =>
            candidateEmail &&
            String(r.candidate_email || '').toLowerCase() === candidateEmail.toLowerCase()
        )
        const nameMatch = !!rows.find(
          (r: any) =>
            candidateName &&
            String(r.candidate_name || '').toLowerCase() === candidateName.toLowerCase()
        )
        matchedBy = emailMatch && nameMatch ? 'email_or_name' : emailMatch ? 'email' : 'name'
      }
    }

    const insertPayload: any = {
      job_form_id: payload.jobId,
      candidate_name: payload.candidateName || null,
      candidate_email: payload.candidateEmail || null,
      status: isDuplicate ? 'duplicate' : 'new',
      is_duplicate: isDuplicate,
      submitted_at: null
    }

    const { data: app, error } = await supabase
      .from('applications')
      // @ts-ignore
      .insert(insertPayload)
      .select('id')
      .single() as any
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
    const supabase = createAdminClient()

    const candidateEmail = String(payload.candidateEmail || '').trim()
    const candidateName = String(payload.candidateName || '').trim()

    // Look for existing applications by same email OR name for this job (ignore empty values)
    const orParts: string[] = []
    if (candidateEmail) orParts.push(`candidate_email.ilike.${candidateEmail}`)
    if (candidateName) orParts.push(`candidate_name.ilike.${candidateName}`)

    const { data: existingApps } = await (async () => {
      if (!orParts.length) return { data: [] as any[] }
      // Use admin client for duplicate checks (public anon client often can't SELECT due to RLS).
      const admin = createAdminClient()
      return await admin
        .from('applications')
        .select('id,submitted_at,status,candidate_email,candidate_name,created_at')
        .eq('job_form_id', payload.jobId)
        .or(orParts.join(','))
        .order('created_at', { ascending: false })
        .limit(200)
    })()

    const excludeId = payload.applicationId || null
    const others = (existingApps || []).filter((a: any) => !excludeId || a.id !== excludeId)
    // Mark as duplicate if ANY prior application exists for the same email/name (submitted or not).
    const isDuplicateByHistory = others.length > 0

    let appId: string | null = null

    // Finalize the specific in-progress application if provided; otherwise fallback to creating a new one.
    if (payload.applicationId) {
      appId = payload.applicationId

      const isDuplicate = isDuplicateByHistory
      const status: 'new' | 'duplicate' = isDuplicate ? 'duplicate' : 'new'
      
      const updatePayload: any = {
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
        status,
        is_duplicate: isDuplicate,
        submitted_at: new Date().toISOString()
      }

      const { data: updated, error: updError } = await supabase
        .from('applications')
        // @ts-ignore
        .update(updatePayload)
        .eq('id', payload.applicationId)
          .select('id')
          .single() as any
        if (updError || !updated?.id) {
        return { applicationId: null, error: updError?.message || 'Failed to finalize application' }
      }
      appId = updated.id
    } else {
      // Insert new application (legacy fallback)
      const isDuplicate = isDuplicateByHistory
      const status: 'new' | 'duplicate' = isDuplicate ? 'duplicate' : 'new'

      const insertPayload: any = {
        job_form_id: payload.jobId,
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
        status,
        is_duplicate: isDuplicate,
        submitted_at: new Date().toISOString()
      }

      const { data: app, error: appError } = await supabase
        .from('applications')
        // @ts-ignore
        .insert(insertPayload)
        .select('id')
        .single() as any
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

      const { error: ansError } = await supabase.from('answers').insert(rows as any)
      if (ansError) {
        return { applicationId: appId, error: ansError.message || 'Failed to save answers' }
      }
    }

    if (payload.resumeUrl) {
      const { error: resumeError } = await supabase.from('resumes').insert({
        application_id: appId,
        file_url: payload.resumeUrl
      } as any)

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
      } as any

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
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Best effort: update last-progress fields on the application row (requires DB columns).
    // If the columns don't exist yet, this will error and we'll silently fall back to just touching updated_at.
    
    const progressUpdate: any = {
      updated_at: now,
      last_progress_step: stepId,
      last_progress_event: eventType,
      last_progress_at: now,
      last_progress_meta: meta
    }

    const upd = await supabase
      .from('applications')
      // @ts-ignore
      .update(progressUpdate)
      .eq('id', applicationId)

    if (upd.error) {
      // Fallback: at least touch updated_at for "recent activity" views.
      const fallbackUpdate: any = { updated_at: now }
      // @ts-ignore
      await supabase.from('applications').update(fallbackUpdate).eq('id', applicationId)
    }

    // Best effort: write a history event (requires table).
    const eventInsert: any = { application_id: applicationId, step_id: stepId, event_type: eventType, meta }
    try {
      await supabase
        .from('application_progress_events')
        // @ts-ignore
        .insert(eventInsert)
    } catch (e) {}

    return { error: null }
  } catch (e: any) {
    return { error: e?.message || 'Unexpected error' }
  }
}
