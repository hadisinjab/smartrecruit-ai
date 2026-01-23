'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { createNotification, getRecipientsForJob } from '@/lib/notifications'
import { sendApplicationConfirmationEmail } from '@/actions/email'
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
    assignment_type?: 'text_only' | 'text_and_links' | 'video_upload' | null
    assignment_description?: string | null
    assignment_timing?: 'before_interview' | 'after_interview' | null
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
      .select('*, assignment_enabled, assignment_timing')
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

    const mapped: ApplyQuestion[] = (questions || [])
      .filter((q) => !q.config?.is_fixed) // Filter out fixed questions (Age, Salary, Education)
      .map((q) => ({
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
        assignment_timing: job.assignment_timing ?? null,
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
  candidatePhone?: string
  candidateAge?: number
  candidateExperience?: number
  desiredSalary?: number
}): Promise<{ applicationId: string | null; error: string | null }> {
  try {
    // Use admin client to bypass RLS for application creation
    const supabase = createTypedAdminClient()
    // Always create a NEW application record.
    // But if candidateName OR candidateEmail matches a prior application for the same job,
    // mark it as duplicate so staff can see the repetition.
    const candidateEmail = String(payload.candidateEmail || '').trim()
    const candidateName = String(payload.candidateName || '').trim()
    const candidatePhone = String(payload.candidatePhone || '').trim()
    const candidateAge = payload.candidateAge || null
    const candidateExperience = payload.candidateExperience || null

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
        if (emailMatch && nameMatch) matchedBy = 'email_or_name'
        else if (emailMatch) matchedBy = 'email'
        else if (nameMatch) matchedBy = 'name'
      }
    }

    const { data: app, error } = await supabase
      .from('applications')
      .insert({
        job_form_id: payload.jobId,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_phone: candidatePhone,
        candidate_age: candidateAge,
        experience: candidateExperience,
        desired_salary: payload.desiredSalary || null,
        is_duplicate: isDuplicate,
        duplicate_of: matchedApplicationIds,
      })
      .select('id')
      .single()

    if (error || !app) {
      return { applicationId: null, error: error?.message || 'Failed to create application' }
    }

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

    for (const ans of payload.answers) {
      // Defensive check for valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ans.questionId);
      if (!isUUID) {
        console.warn(`Skipping progress save for invalid questionId: "${ans.questionId}"`);
        continue;
      }

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
  applicationId: string
  assignment?: {
    text?: string | null
    links?: string[] | null
    video_url?: string | null
  }
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createTypedAdminClient()

    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('*, job_forms(*)')
      .eq('id', payload.applicationId)
      .single()

    if (appErr || !app) {
      return { success: false, error: 'Application not found' }
    }

    if (app.submitted_at) {
      return { success: false, error: 'Application has already been submitted' }
    }

    const { error } = await supabase
      .from('applications')
      .update({
        submitted_at: new Date().toISOString(),
        assignment_text: payload.assignment?.text,
        assignment_links: payload.assignment?.links,
        assignment_video_url: payload.assignment?.video_url,
      })
      .eq('id', payload.applicationId)

    if (error) {
      return { success: false, error: error.message }
    }

    await recordProgress(payload.applicationId, 'review', 'submit', {
      assignment: !!payload.assignment,
    }).catch(() => {})

    // Send notifications
    try {
      const notificationData = await getRecipientsForJob(app.job_form_id)
      if (notificationData.recipients.length > 0) {
        const notificationPromises = notificationData.recipients.map((userId: string) =>
          createNotification({
            user_id: userId,
            type: 'new_application',
            title: `New Application: ${app.candidate_name || 'Unknown'}`,
            content: `A new application was submitted for the "${
              notificationData.job?.title || 'Unknown Job'
            }" position.`,

            metadata: {
              url: `/admin/applications/${payload.applicationId}`,
              entityType: 'application',
              entityId: payload.applicationId,
            },
          })
        )
        await Promise.all(notificationPromises)
      }
    } catch (e) {
      console.error('Failed to send notifications:', e)
    }

    // Send confirmation email
    if (app.candidate_email && app.job_forms?.title) {
      await sendApplicationConfirmationEmail({
        candidateEmail: app.candidate_email,
        candidateName: app.candidate_name || 'Applicant',
        jobTitle: app.job_forms.title,
      })
    }

    return { success: true, error: null }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to submit' }
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

export async function getApplicationIdByEmail(jobId: string, email: string): Promise<{ applicationId: string | null; error: string | null }> {
  try {
    const supabase = createTypedAdminClient();
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('job_form_id', jobId)
      .eq('candidate_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching application by email:', error);
      return { applicationId: null, error: 'Application not found' };
    }

    return { applicationId: data.id, error: null };
  } catch (e: any) {
    console.error('Unexpected error in getApplicationIdByEmail:', e);
    return { applicationId: null, error: e?.message || 'Unexpected error' };
  }
}
