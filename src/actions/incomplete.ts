
'use server'

import { createClient } from '@/utils/supabase/server'
import { IncompleteApplication } from '@/types/admin'
import { requireStaff } from '@/utils/authz'

export async function getIncompleteApplications(): Promise<IncompleteApplication[]> {
  const supabase = createClient()
  const session = await requireStaff()
  
  // Enforce org scoping for non-super-admin (applications table itself isn't org-scoped).
  let allowedJobFormIds: string[] | null = null
  if (session.role !== 'super-admin') {
    if (!session.organizationId) return []
    const { data: jobs, error: jobsErr } = await supabase
      .from('job_forms')
      .select('id')
      .eq('organization_id', session.organizationId)

    if (jobsErr) {
      console.error('Error fetching org job forms for incomplete apps:', jobsErr)
      return []
    }
    allowedJobFormIds = (jobs || []).map((j: any) => j.id).filter(Boolean)
    if (!allowedJobFormIds.length) return []
  }

  let query = supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms(title),
      answers(question_id,value,voice_data),
      resumes(*),
      external_profiles(*)
    `)
    // Include duplicates as "incomplete" too if they are not submitted yet.
    .in('status', ['new', 'duplicate'])
    .is('submitted_at', null)
    .order('created_at', { ascending: false })

  if (allowedJobFormIds) {
    query = query.in('job_form_id', allowedJobFormIds)
  }

  const { data: applications, error } = await query

  if (error) {
    console.error('Error fetching incomplete applications:', error)
    return []
  }

  // Build question counts per job form to compute completion percentages
  const jobFormIds = Array.from(new Set((applications || []).map((a: any) => a.job_form_id).filter(Boolean)))
  let questionsByJobForm = new Map<string, number>()
  let questionTypeById = new Map<string, string>()
  if (jobFormIds.length) {
    const { data: qs } = await supabase
      .from('questions')
      .select('id,job_form_id,type')
      .in('job_form_id', jobFormIds)
    const counts: Record<string, number> = {}
    ;(qs || []).forEach((q: any) => {
      const id = q.job_form_id as string
      counts[id] = (counts[id] || 0) + 1
      questionTypeById.set(q.id as string, String(q.type || 'text').toLowerCase())
    })
    questionsByJobForm = new Map(Object.entries(counts))
  }
  
  const appIds = (applications || []).map((a: any) => a.id).filter(Boolean) as string[]

  // Prefer exact tracking via application_progress_events / last_progress_step.
  const lastEventByApp = new Map<string, any>()
  if (appIds.length) {
    const { data: events } = await supabase
      .from('application_progress_events')
      .select('application_id,step_id,event_type,meta,created_at')
      .in('application_id', appIds)
      .order('created_at', { ascending: false })
      .limit(5000)

    ;(events || []).forEach((e: any) => {
      if (!lastEventByApp.has(e.application_id)) {
        lastEventByApp.set(e.application_id, e)
      }
    })
  }

  return (applications || []).map((app: any) => {
    const totalQuestions = questionsByJobForm.get(app.job_form_id) || 0
    const answeredCount = (app.answers || []).length
    const completionPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
    const lastActivity = app.updated_at || app.created_at
    const timeSpentMinutes = Math.max(
      1,
      Math.round((new Date(lastActivity).getTime() - new Date(app.created_at).getTime()) / 60000)
    )
    const hasResume = Array.isArray(app.resumes) && app.resumes.length > 0
    const hasPersonalInfo = !!(app.candidate_name && app.candidate_email)
    
    const answeredTypes = {
      text: false,
      textarea: false,
      voice: false,
      file: false,
      url: false
    }
    ;(app.answers || []).forEach((ans: any) => {
      const t = questionTypeById.get(ans.question_id) || 'text'
      if ((t === 'text' || t === 'short_text') && ans.value) answeredTypes.text = true
      if ((t === 'textarea' || t === 'long_text') && ans.value) answeredTypes.textarea = true
      if ((t === 'voice' || t === 'audio' || t === 'voice_recording') && ans.voice_data) answeredTypes.voice = true
      if ((t === 'file' || t === 'file_upload') && (ans.value || hasResume)) answeredTypes.file = true
      if ((t === 'url' || t === 'link') && ans.value) answeredTypes.url = true
    })
    
    let stoppedAt =
      (app as any)?.last_progress_step ||
      lastEventByApp.get(app.id)?.step_id ||
      'application-info'

    // Fallback to heuristic only if we have no tracked step.
    if (!stoppedAt) {
      if (answeredTypes.voice) stoppedAt = 'voice-recording'
      else if (answeredTypes.file || hasResume) stoppedAt = 'file-upload'
      else if (answeredTypes.url) stoppedAt = 'link-input'
      else if (answeredTypes.text || answeredTypes.textarea) stoppedAt = 'text-questions'
      else if (!hasPersonalInfo) stoppedAt = 'application-info'
      else stoppedAt = 'application-info'
    }

    return {
      id: app.id,
      jobFormId: app.job_form_id,
      firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
      lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
      email: app.candidate_email || '',
      phone: '',
      location: 'Remote',
      position: app.job_form?.title || 'Unknown Position',
      experience: 0,
      status: 'applied',
      appliedDate: app.created_at,
      lastUpdate: lastActivity,
      source: 'Website',
      notes: '',
      rating: 0,
      tags: [],
      hrFields: {
        priority: 'medium',
        notes: '',
        nextAction: '',
        nextActionDate: ''
      },
      lastActivity,
      completionPercentage,
      timeSpent: timeSpentMinutes,
      progress: {
        personalInfo: hasPersonalInfo,
        experience: completionPercentage >= 30,
        documents: hasResume,
        questionnaire: answeredCount > 0
      },
      stoppedAt
    }
  })
}
