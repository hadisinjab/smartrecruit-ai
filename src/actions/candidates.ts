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
      hr_evaluations(*),
      answers(*)
    `)
    .neq('status', 'incomplete')
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
    
    // Extract age and experience from answers
    let age: number | undefined = undefined;
    let experience: number = 0;
    
    if (app.answers && Array.isArray(app.answers)) {
      app.answers.forEach((answer: any) => {
        if (answer.value) {
          const valueStr = String(answer.value).toLowerCase();
          
          // Look for age-related patterns - more specific patterns first
          const agePatterns = [
            /i am (\d+) years? old/,
            /my age is (\d+)/,
            /age:?(\d+)/,
            /عمري (\d+)/,
            /العمر:?(\d+)/,
            /عمر:?(\d+)/
          ];
          
          for (const pattern of agePatterns) {
            const match = valueStr.match(pattern);
            if (match) {
              age = parseInt(match[1]);
              break;
            }
          }
          
          // If no specific age pattern found, look for general age keywords
          if (age === undefined && (valueStr.includes('age') || valueStr.includes('عمر'))) {
            const ageMatch = valueStr.match(/\d+/);
            if (ageMatch) {
              const num = parseInt(ageMatch[0]);
              // Only consider it age if it's a reasonable age range (15-100)
              if (num >= 15 && num <= 100) {
                age = num;
              }
            }
          }
          
          // Look for experience-related patterns - more specific patterns first
          const expPatterns = [
            /(\d+) years? of experience/,
            /experience:?(\d+)/,
            /خبرة (\d+)/,
            /سنوات الخبرة:?(\d+)/,
            /(\d+) سنو?ات خبرة/,
            /(\d+) years? experience/,
            /(\d+)\s+years?(?!.*old)/, // Capture "5 years" but not "5 years old"
            /(\d+)\s+سنو?ات(?!.*عمر)/
          ];
          
          for (const pattern of expPatterns) {
            const match = valueStr.match(pattern);
            if (match) {
              experience = parseInt(match[1]);
              break;
            }
          }
          
          // If no specific experience pattern found, look for general experience keywords
          if (experience === 0 && (valueStr.includes('experience') || valueStr.includes('خبرة'))) {
            const expMatch = valueStr.match(/\d+/);
            if (expMatch) {
              const num = parseInt(expMatch[0]);
              // Only consider it experience if it's a reasonable range (0-50)
              if (num >= 0 && num <= 50) {
                experience = num;
              }
            }
          }
        }
      });
    }
    
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
      experience: experience, // Extracted from answers
      age: age, // Extracted from answers
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
        nextActionDate: latestHrEval.next_action_date || null
      }
    } as any;

    if (session.role === 'super-admin') {
      base.organizationName = app.job_form?.organizations?.name;
      base.jobOwnerName = app.job_form?.creator?.full_name;
    }

    return base;
  });

  // Backfill duplicate display for older rows where is_duplicate/status weren't persisted yet.
  // Group by job + email (preferred) or job + name.
  const keyFor = (c: any) => {
    const jobKey = String((applications as any[]).find((a: any) => a.id === c.id)?.job_form_id || '')
    const email = String(c.email || '').trim().toLowerCase()
    const name = `${String(c.firstName || '').trim().toLowerCase()} ${String(c.lastName || '').trim().toLowerCase()}`.trim()
    return email ? `${jobKey}|email|${email}` : `${jobKey}|name|${name}`
  }

  const byKey = new Map<string, any[]>()
  candidates.forEach((c: any) => {
    const k = keyFor(c)
    const arr = byKey.get(k) || []
    arr.push(c)
    byKey.set(k, arr)
  })
  byKey.forEach((arr) => {
    if (arr.length <= 1) return
    // Sort by appliedDate (created_at) ascending so the first stays non-duplicate.
    arr.sort((a, b) => new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime())
    arr.forEach((c, idx) => {
      if (idx === 0) return
      c.isDuplicate = true
      if (c.status === 'new') c.status = 'duplicate'
    })
  })

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
      ai_evaluations(*),
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

  // Pull the most recent progress event for precise stopped-at tracking.
  const { data: lastEvent } = await supabase
    .from('application_progress_events')
    .select('step_id,event_type,meta,created_at')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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

  // Best-effort progress inference (we no longer persist step logs).
  // This powers "Stopped At" in the candidate details UI.
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
    const t = qMap.get(ans.question_id)?.type || 'text'
    if (t === 'text' && ans.value) answeredTypes.text = true
    if (t === 'textarea' && ans.value) answeredTypes.textarea = true
    if (t === 'voice' && ans.voice_data) answeredTypes.voice = true
    if (t === 'file' && (ans.value || hasResume)) answeredTypes.file = true
    if (t === 'url' && ans.value) answeredTypes.url = true
  })

  // Prefer persisted progress from DB/event log (exact), fallback to best-effort inference.
  let lastProgressStep: string | undefined =
    (app as any)?.last_progress_step ||
    (lastEvent as any)?.step_id ||
    undefined
  const lastProgressEvent: string | undefined =
    (app as any)?.last_progress_event ||
    (lastEvent as any)?.event_type ||
    undefined
  const lastProgressAt: string | undefined =
    (app as any)?.last_progress_at ||
    (lastEvent as any)?.created_at ||
    undefined
  const lastProgressMeta: any =
    (app as any)?.last_progress_meta ||
    (lastEvent as any)?.meta ||
    null
  if (!lastProgressStep) {
    if (app.submitted_at) {
      lastProgressStep = 'submitted'
    } else {
      if (answeredTypes.voice) lastProgressStep = 'voice-recording'
      else if (answeredTypes.file || hasResume) lastProgressStep = 'file-upload'
      else if (answeredTypes.url) lastProgressStep = 'link-input'
      else if (answeredTypes.text || answeredTypes.textarea) lastProgressStep = 'text-questions'
      else if (!hasPersonalInfo) lastProgressStep = 'application-info'
      else lastProgressStep = 'application-info'
    }
  }

  // Get latest HR evaluation if exists
  const latestHrEval = app.hr_evaluations?.[0] || {};

  const base = {
    id: app.id,
    submittedAt: app.submitted_at || null,
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
    lastProgressStep,
    lastProgressEvent,
    lastProgressAt: lastProgressAt || null,
    lastProgressMeta,
    ai_evaluations: app.ai_evaluations,
    hrFields: {
      priority: 'medium',
      notes: latestHrEval.hr_notes || '',
      nextAction: latestHrEval.hr_decision || 'Review',
      nextActionDate: latestHrEval.next_action_date || null
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
  
  // NOTE: We removed `activity_logs` and no longer store candidate progress steps.
  // We infer `lastProgressStep` best-effort from existing data above.

  if (session.role === 'super-admin') {
    base.organizationName = app.job_form?.organizations?.name;
    base.jobOwnerName = app.job_form?.creator?.full_name;
  }

  return base;
}
