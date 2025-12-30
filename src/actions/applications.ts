'use server'

import { createClient } from '@/utils/supabase/server'

type ApplyJob = {
  id: string
  title: string
  description: string | null
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
      .select('id,title,description,status,assignment_enabled,assignment_required,assignment_type,assignment_description,assignment_weight')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return { job: null, questions: [], error: jobError?.message || 'Job not found' }
    }

    // If policy changes or staff sees non-active jobs, enforce active here for apply UX.
    if ((job as any).status && (job as any).status !== 'active') {
      return { job: null, questions: [], error: 'Job is not available for applications' }
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
    const supabase = createClient()
    // Try to reuse existing incomplete application for this candidate and job
    if (payload.candidateEmail) {
      const { data: existing } = await supabase
        .from('applications')
        .select('id,submitted_at')
        .eq('job_form_id', payload.jobId)
        .ilike('candidate_email', payload.candidateEmail)
      const found = (existing || []).find((a: any) => !a.submitted_at)
      if (found?.id) {
        return { applicationId: found.id, error: null }
      }
    }
    const { data: app, error } = await supabase
      .from('applications')
      .insert({
        job_form_id: payload.jobId,
        candidate_name: payload.candidateName || null,
        candidate_email: payload.candidateEmail || null,
        status: 'new',
        is_duplicate: false,
        submitted_at: null
      })
      .select('id')
      .single()
    if (error || !app?.id) {
      return { applicationId: null, error: error?.message || 'Failed to begin application' }
    }
    return { applicationId: app.id, error: null }
  } catch (e: any) {
    return { applicationId: null, error: e?.message || 'Unexpected error' }
  }
}

export async function submitApplication(payload: {
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
    const supabase = createClient()

    // Look for existing applications by same email for this job
    const { data: existingApps } = await supabase
      .from('applications')
      .select('id,submitted_at,status')
      .eq('job_form_id', payload.jobId)
      .ilike('candidate_email', payload.candidateEmail)

    const incomplete = (existingApps || []).find((a: any) => !a.submitted_at)
    const completed = (existingApps || []).find((a: any) => !!a.submitted_at)

    let appId: string | null = null

    if (incomplete) {
      // Reuse the incomplete application: mark it submitted and proceed
      const { data: updated, error: updError } = await supabase
        .from('applications')
        .update({
          candidate_name: payload.candidateName,
          candidate_email: payload.candidateEmail,
          status: 'new',
          is_duplicate: false,
          submitted_at: new Date().toISOString()
        })
        .eq('id', incomplete.id)
        .select('id')
        .single()
      if (updError || !updated?.id) {
        return { applicationId: null, error: updError?.message || 'Failed to finalize existing application' }
      }
      appId = updated.id
    } else {
      // Insert new application; mark as duplicate if a completed one already exists
      const isDuplicate = !!completed
      const status: 'new' | 'duplicate' = isDuplicate ? 'duplicate' : 'new'
      const { data: app, error: appError } = await supabase
        .from('applications')
        .insert({
          job_form_id: payload.jobId,
          candidate_name: payload.candidateName,
          candidate_email: payload.candidateEmail,
          status,
          is_duplicate: isDuplicate,
          submitted_at: new Date().toISOString()
        })
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

    return { applicationId: appId, error: null }
  } catch (e: any) {
    return { applicationId: null, error: e?.message || 'Unexpected error' }
  }
}

export async function recordProgress(applicationId: string, stepId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient()
    await supabase
      .from('applications')
      .update({ updated_at: new Date().toISOString() } as any)
      .eq('id', applicationId)
    return { error: null }
  } catch (e: any) {
    return { error: e?.message || 'Unexpected error' }
  }
}
