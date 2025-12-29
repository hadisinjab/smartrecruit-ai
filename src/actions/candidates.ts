'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/utils/authz'

export async function getCandidates(jobId?: string) {
  const supabase = createClient()
  const session = await requireStaff()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  let jobIds: string[] | null = null

  if (jobId && jobId !== 'all') {
    jobIds = [jobId]
  } else if (session.role === 'admin' || session.role === 'reviewer') {
    if (session.organizationId) {
      const { data: jobsForOrg, error: jobsErr } = await supabase
        .from('job_forms')
        .select('id')
        .eq('organization_id', session.organizationId)
      if (jobsErr) {
        throw new Error('Failed to fetch jobs for organization')
      }
      jobIds = (jobsForOrg || []).map((j: any) => j.id)
      if (jobIds.length === 0) {
        return []
      }
    } else {
      const { data: jobsForUser } = await supabase
        .from('job_forms')
        .select('id')
        .eq('created_by', session.id)
      jobIds = (jobsForUser || []).map((j: any) => j.id)
      if (jobIds.length === 0) {
        return []
      }
    }
  }

  let query = supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms!inner(
        title,
        created_by,
        organization_id,
        organizations(name),
        creator:users(full_name)
      ),
      resumes(*),
      external_profiles(*),
      hr_evaluations(*)
    `)
    .order('created_at', { ascending: false })

  if (jobIds) {
    query = query.in('job_form_id', jobIds)
  }

  const { data: applications, error } = await query

  if (error) {
    console.error('Error fetching candidates:', error)
    throw new Error('Failed to fetch candidates')
  }

  const candidates = applications.map(app => {
    const latestHrEval = app.hr_evaluations?.[0] || {};
    
    const base = {
      id: app.id,
      submittedAt: app.submitted_at || null,
      isDuplicate: !!app.is_duplicate,
      firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
      lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
      email: app.candidate_email || '',
      position: app.job_form?.title || 'Unknown Position',
      department: 'Engineering', // Placeholder as it's not directly in application
      location: 'Remote', // Placeholder
      status: app.status || 'applied',
      appliedDate: app.created_at,
      experience: 0, // Placeholder
      rating: latestHrEval.hr_score || 0,
      resumeUrl: app.resumes?.[0]?.file_url || '',
      linkedinUrl: app.external_profiles?.find((p: any) => p.type === 'linkedin')?.url || '',
      portfolioUrl: app.external_profiles?.find((p: any) => p.type === 'portfolio')?.url || '',
      tags: [], // Placeholder
      phone: '', // Placeholder
      hrFields: {
        priority: 'medium', // Default
        notes: latestHrEval.hr_notes || '',
        nextAction: latestHrEval.hr_decision || 'Review',
        nextActionDate: new Date().toISOString() // Placeholder
      }
    } as any;

    if (session.role === 'super-admin') {
      base.organizationName = app.job_form?.organizations?.name;
      base.jobOwnerName = app.job_form?.creator?.full_name;
    }

    return base;
  });

  return candidates;
}

export async function getCandidateById(id: string) {
  const supabase = createClient()
  const session = await requireStaff()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: app, error } = await supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms(
        title,
        created_by,
        organization_id,
        organizations(name),
        creator:users(full_name)
      ),
      resumes(*),
      external_profiles(*),
      hr_evaluations(*),
      answers(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching candidate:', error)
    return null
  }

  // Admins can only view candidates tied to their own job forms
  if (session.role === 'admin') {
    if (session.organizationId) {
      // If organization-based, check organization match
      if (app.job_form?.organization_id !== session.organizationId) {
        throw new Error('Access denied')
      }
    } else {
      // Fallback to ownership check
      if (app.job_form?.created_by !== user.id) {
        throw new Error('Access denied')
      }
    }
  }
  // Reviewer: allowed to view; salary fields are not exposed in this mapper

  // Fetch question metadata to enrich answers with labels and types
  const { data: questions } = await supabase
    .from('questions')
    .select('id,type,label')
    .eq('job_form_id', app.job_form_id)

  const normalizeType = (raw: string | null | undefined) => {
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

  const qMap = new Map<string, { label: string; type: string }>()
  ;(questions || []).forEach((q: any) => {
    qMap.set(q.id, { label: q.label, type: normalizeType(q.type) })
  })

  // Get latest HR evaluation if exists
  const latestHrEval = app.hr_evaluations?.[0] || {};

  const base = {
    id: app.id,
    firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
    lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
    email: app.candidate_email || '',
    position: app.job_form?.title || 'Unknown Position',
    department: 'Engineering', // Placeholder
    location: 'Remote', // Placeholder
    status: app.status || 'applied',
    appliedDate: app.created_at,
    experience: 0, // Placeholder
    rating: latestHrEval.hr_score || 0,
    resumeUrl: app.resumes?.[0]?.file_url || '',
    linkedinUrl: app.external_profiles?.find((p: any) => p.type === 'linkedin')?.url || '',
    portfolioUrl: app.external_profiles?.find((p: any) => p.type === 'portfolio')?.url || '',
    tags: [], // Placeholder
    phone: '', // Placeholder
    hrFields: {
      priority: 'medium',
      notes: latestHrEval.hr_notes || '',
      nextAction: latestHrEval.hr_decision || 'Review',
      nextActionDate: new Date().toISOString()
    },
    answers: (app.answers || []).map((ans: any) => {
      const q = qMap.get(ans.question_id)
      const type = q?.type || 'text'
      const label = q?.label || ans.question_id
      const value: string | null = ans.value ?? null
      const voiceData = ans.voice_data ?? null
      let audioUrl: string | null = null
      if (voiceData && typeof voiceData === 'object' && (voiceData as any).audio_url) {
        audioUrl = String((voiceData as any).audio_url)
      }
      const isUrl = typeof value === 'string' && /^https?:\/\//i.test(value)
      const fileName = isUrl ? (value.split('/').pop() || '') : ''

      return {
        id: ans.id,
        questionId: ans.question_id,
        label,
        type,
        value,
        voiceData,
        audioUrl,
        isUrl,
        fileName
      }
    })
  } as any;
  
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('action,details,created_at,target_type,target_id')
    .eq('target_type', 'application')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
  const lastProgressLog = (logs || [])[0]
  if (lastProgressLog?.details?.stepId) {
    base.lastProgressStep = String(lastProgressLog.details.stepId)
  }

  if (session.role === 'super-admin') {
    base.organizationName = app.job_form?.organizations?.name;
    base.jobOwnerName = app.job_form?.creator?.full_name;
  }

  return base;
}
