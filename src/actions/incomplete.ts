
'use server'

import { createClient } from '@/utils/supabase/server'
import { IncompleteApplication } from '@/types/admin'

export async function getIncompleteApplications(): Promise<IncompleteApplication[]> {
  const supabase = createClient()
  
  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms(title),
      answers(question_id,value,voice_data),
      resumes(*),
      external_profiles(*)
    `)
    .eq('status', 'new')
    .is('submitted_at', null)
    .order('created_at', { ascending: false })

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
  
  const appIds = (applications || []).map((a: any) => a.id)
  // NOTE: We no longer persist candidate progress steps in `activity_logs`.
  // We compute a best-effort `stoppedAt` from existing application/answers data.
  const lastLogByApp = new Map<string, any>()

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
    
    let stoppedAt = 'application-info'
    const progressLog = lastLogByApp.get(app.id)
    const loggedStep = progressLog?.details?.stepId || progressLog?.details?.step || null
    if (loggedStep) {
      stoppedAt = String(loggedStep)
    } else {
      if (answeredTypes.voice) stoppedAt = 'voice-recording'
      else if (answeredTypes.file || hasResume) stoppedAt = 'file-upload'
      else if (answeredTypes.url) stoppedAt = 'link-input'
      else if (answeredTypes.text || answeredTypes.textarea) stoppedAt = 'text-questions'
      else if (!hasPersonalInfo) stoppedAt = 'application-info'
    }

    return {
      id: app.id,
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
