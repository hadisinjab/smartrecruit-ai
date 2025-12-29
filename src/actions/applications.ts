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
  job: ApplyJob | null
  questions: ApplyQuestion[]
  error: string | null
}> {
  try {
    const supabase = createClient()

    // Public can only see active jobs due to RLS policy.
    const { data: job, error: jobError } = await supabase
      .from('job_forms')
      .select('id,title,description,status')
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

    return { job: { id: job.id, title: job.title, description: job.description }, questions: mapped, error: null }
  } catch (e: any) {
    return { job: null, questions: [], error: e?.message || 'Unexpected error' }
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

    const { data: app, error: appError } = await supabase
      .from('applications')
      .insert({
        job_form_id: payload.jobId,
        candidate_name: payload.candidateName,
        candidate_email: payload.candidateEmail,
        status: 'new',
        is_duplicate: false,
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (appError || !app?.id) {
      return { applicationId: null, error: appError?.message || 'Failed to create application' }
    }

    if (payload.answers?.length) {
      const rows = payload.answers
        .filter((a) => a.questionId)
        .map((a) => ({
          application_id: app.id,
          question_id: a.questionId,
          value: a.value ?? null,
          voice_data: a.voiceData ?? null
        }))

      const { error: ansError } = await supabase.from('answers').insert(rows as any)
      if (ansError) {
        return { applicationId: app.id, error: ansError.message || 'Failed to save answers' }
      }
    }

    if (payload.resumeUrl) {
      const { error: resumeError } = await supabase.from('resumes').insert({
        application_id: app.id,
        file_url: payload.resumeUrl
      } as any)

      if (resumeError) {
        return { applicationId: app.id, error: resumeError.message || 'Failed to save resume' }
      }
    }

    return { applicationId: app.id, error: null }
  } catch (e: any) {
    return { applicationId: null, error: e?.message || 'Unexpected error' }
  }
}
