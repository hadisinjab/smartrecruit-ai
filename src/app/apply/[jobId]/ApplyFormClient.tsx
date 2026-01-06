'use client'

import React, { useMemo, useState } from 'react'
import { MultiStepForm } from '@/components/form/multi-step-form'
import type { FormField, FormStep, FormData } from '@/types/form'
import type { ApplyQuestion } from '@/actions/applications'
import { submitApplication, beginApplication } from '@/actions/applications'
import { createAssignment } from '@/actions/assignments'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type ApplyJob = {
  id: string
  title: string
  description: string | null
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

interface Props {
  job: ApplyJob
  textQuestions: ApplyQuestion[]
  mediaQuestions: ApplyQuestion[]
  jobId: string
}

function toFormField(q: ApplyQuestion): FormField {
  return {
    id: q.id,
    type: q.type,
    label: q.label,
    required: q.required,
    pageNumber: q.pageNumber,
    options: q.options,
    placeholder: q.placeholder
  }
}

async function uploadResume(file: File, jobId: string) {
  const supabase = createClient()

  // Try buckets in order; see STORAGE_SETUP.md
  const buckets = ['files', 'resumes']

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `applications/${jobId}/${crypto.randomUUID()}.${ext}`

  let lastError: any = null
  for (const bucket of buckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return { url: data.publicUrl, error: null as string | null }
    }
    lastError = error
  }

  return { url: null as string | null, error: lastError?.message || 'Failed to upload file' }
}

export default function ApplyFormClient({ job, textQuestions, mediaQuestions, jobId }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  const steps: FormStep[] = useMemo(() => {
    const baseFields: FormField[] = [
      {
        id: 'candidate_name',
        type: 'text',
        label: 'Full name',
        placeholder: 'Enter your full name',
        required: true
      },
      {
        id: 'candidate_email',
        type: 'text',
        label: 'Email',
        placeholder: 'you@example.com',
        required: true,
        validation: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Please enter a valid email address'
        }
      }
    ]

    const formatMoney = (amount: any, currency: string) => {
      const n = typeof amount === 'number' ? amount : Number(amount)
      if (!Number.isFinite(n)) return null
      try {
        // Use a deterministic locale to avoid SSR/CSR hydration mismatches.
        // (Using `undefined` depends on the runtime's default locale, which can differ between server and client.)
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD',
          currencyDisplay: 'symbol',
          maximumFractionDigits: 0,
        }).format(n)
      } catch {
        return `${n} ${currency || ''}`.trim()
      }
    }

    const salaryMin = (job as any)?.salary_min ?? null
    const salaryMax = (job as any)?.salary_max ?? null
    const salaryCurrency = String((job as any)?.salary_currency || 'USD')
    const salaryMinText = formatMoney(salaryMin, salaryCurrency)
    const salaryMaxText = formatMoney(salaryMax, salaryCurrency)
    const salaryText =
      salaryMinText && salaryMaxText
        ? `${salaryMinText} - ${salaryMaxText}`
        : salaryMinText || salaryMaxText || null

    const normalizeList = (v: any): string[] => {
      if (!v) return []
      if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean)
      if (typeof v === 'string') {
        return v
          .split(/\r?\n|,/g)
          .map((s) => s.trim())
          .filter(Boolean)
      }
      return []
    }

    const requirements = normalizeList((job as any)?.requirements)
    const benefits = normalizeList((job as any)?.benefits)

    const s: FormStep[] = [
      {
        id: 'job',
        title: job.title,
        description: 'Review the job details, then click Apply.',
        content: (
          <div className="space-y-6">
            {job.description && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Job Description</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{job.description}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {salaryText && (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-500">Salary</div>
                  <div className="text-sm font-semibold text-gray-900">{salaryText}</div>
                </div>
              )}
              {(job as any)?.location && (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-500">Location</div>
                  <div className="text-sm font-semibold text-gray-900">{String((job as any).location)}</div>
                </div>
              )}
              {(job as any)?.department && (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-500">Department</div>
                  <div className="text-sm font-semibold text-gray-900">{String((job as any).department)}</div>
                </div>
              )}
              {(job as any)?.type && (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="text-xs text-gray-500">Type</div>
                  <div className="text-sm font-semibold text-gray-900">{String((job as any).type)}</div>
                </div>
              )}
              {(job as any)?.deadline && (
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 sm:col-span-2">
                  <div className="text-xs text-gray-500">Deadline</div>
                  <div className="text-sm font-semibold text-gray-900" suppressHydrationWarning>
                    {new Date(String((job as any).deadline)).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {requirements.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Requirements</div>
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {requirements.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {benefits.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Benefits</div>
                <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                  {benefits.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ),
        fields: []
      },
      {
        id: 'candidate',
        title: 'Application Information',
        description: 'Provide your name and email.',
        fields: baseFields
      }
    ]

    if (textQuestions.length) {
      s.push({
        id: 'text-questions',
        title: 'Text Questions',
        description: 'Answer the following questions.',
        fields: textQuestions.map(toFormField)
      })
    }

    if (mediaQuestions.length) {
      // Enforce order: Voice -> File -> URL
      const typeOrder: Record<string, number> = { voice: 1, file: 2, url: 3 }
      const sortedMediaQuestions = [...mediaQuestions].sort((a, b) => {
        const orderA = typeOrder[a.type] || 99
        const orderB = typeOrder[b.type] || 99
        return orderA - orderB
      })

      s.push({
        id: 'media-questions',
        title: 'Uploads & Links',
        description: 'Provide any files, voice responses, or links requested.',
        fields: sortedMediaQuestions.map(toFormField)
      })
    }

    const assignmentEnabled = !!(job as any)?.assignment_enabled
    if (assignmentEnabled) {
      s.push({
        id: 'assignment',
        title: 'Assignment',
        description: 'Complete the assignment task.',
        fields: []
      })
    }

    s.push({
      id: 'review',
      title: 'Review & Submit',
      description: 'Please review your information before submitting.',
      fields: []
    })

    return s
  }, [job.title, job.description, textQuestions, mediaQuestions])

  const allQuestions = useMemo(() => [...textQuestions, ...mediaQuestions], [textQuestions, mediaQuestions])

  const handleComplete = async (data: FormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const candidateName = String(data.candidate_name || '').trim()
      const candidateEmail = String(data.candidate_email || '').trim()
      if (!candidateName || !candidateEmail) {
        setSubmitError('Please provide your name and email.')
        return
      }
      if (!applicationId) {
        const started = await beginApplication({ jobId, candidateName, candidateEmail })
        if (started.error) {
          setSubmitError(started.error)
          return
        }
        setApplicationId(started.applicationId)
      }

      // Ensure file-answers have URLs (FileUploadQuestion uploads immediately, but keep a fallback here)
      const fileUrlByQuestionId: Record<string, string | null> = {}
      for (const q of allQuestions) {
        if (q.type !== 'file') continue
        const v = data[q.id]
        if (typeof v === 'string' && v) {
          fileUrlByQuestionId[q.id] = v
          continue
        }
        if (v && typeof v === 'object' && (v as any).uploading) {
          setSubmitError('Please wait for file uploads to finish before submitting.')
          return
        }
        if (v && typeof v === 'object' && v instanceof File) {
          const { url, error } = await uploadResume(v, jobId)
          if (error) {
            setSubmitError(error)
            return
          }
          fileUrlByQuestionId[q.id] = url
          continue
        }
        fileUrlByQuestionId[q.id] = null
      }

      // Resume URL: keep using first file question as "resume" for the resumes table (legacy behavior)
      const firstFileQ = allQuestions.find((q) => q.type === 'file')
      const resumeUrl = firstFileQ ? (fileUrlByQuestionId[firstFileQ.id] || null) : null

      const answers = allQuestions.map((q) => {
        const v = data[q.id]
        if (q.type === 'voice') {
          // VoiceQuestion stores structured JSON after upload (audio_url, duration, etc.)
          if (v && typeof v === 'object' && (v as any).uploading) {
            setSubmitError('Please wait for voice uploads to finish before submitting.')
            throw new Error('voice_upload_pending')
          }
          return { questionId: q.id, value: null, voiceData: v || null }
        }
        if (q.type === 'file') {
          // Persist each file answer URL to the DB
          return { questionId: q.id, value: fileUrlByQuestionId[q.id] || null, voiceData: null }
        }
        return { questionId: q.id, value: v == null ? null : String(v), voiceData: null }
      })

      const res = await submitApplication({
        applicationId: applicationId || undefined,
        jobId,
        candidateName,
        candidateEmail,
        answers,
        resumeUrl
      })

      if (res.error) {
        setSubmitError(res.error)
        return
      }

      // Save assignment (optional)
      const assignmentEnabled = !!(job as any)?.assignment_enabled
      if (assignmentEnabled) {
        const assignment = (data as any)?.assignment as any
        const assignmentType = (job as any)?.assignment_type || 'text_only'
        const required = !!(job as any)?.assignment_required

        const textFields = String(assignment?.text_fields || '').trim()
        const linkFields = Array.isArray(assignment?.link_fields) ? assignment.link_fields : []

        if (required) {
          if (!textFields) {
            setSubmitError('Assignment is required')
            return
          }
          if (assignmentType === 'text_and_links' && (!linkFields || linkFields.length === 0)) {
            setSubmitError('Please provide at least one assignment link')
            return
          }
        }

        // Only create if user provided something OR required
        const hasAny = !!textFields || (Array.isArray(linkFields) && linkFields.length > 0)
        if (hasAny || required) {
          const created = await createAssignment({
            application_id: res.applicationId as string,
            type: assignmentType,
            text_fields: textFields || undefined,
            link_fields: linkFields || undefined,
          } as any)

          if (!(created as any)?.ok) {
            setSubmitError((created as any)?.error || 'Failed to save assignment')
            return
          }
        }
      }

      setSubmitted(true)
    } catch (e: any) {
      console.error(e)
      setSubmitError(e?.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-6'>
        <Card className='max-w-xl w-full p-6'>
          <h2 className='text-2xl font-bold text-gray-900 mb-2'>Application submitted</h2>
          <p className='text-gray-600 mb-6'>Thanks for applying. We’ll review your application and get back to you.</p>
          <a href='/'>
            <Button>Back to Home</Button>
          </a>
        </Card>
      </div>
    )
  }

  return (
    <div>
      {submitError && (
        <div className='max-w-4xl mx-auto px-4 pt-6'>
          <div className='bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm'>
            {submitError}
          </div>
        </div>
      )}

      <MultiStepForm
        steps={steps}
        onComplete={handleComplete}
        jobFormId={jobId}
        applicationId={applicationId || undefined}
        assignmentConfig={
          (job as any)?.assignment_enabled
            ? {
                enabled: !!(job as any)?.assignment_enabled,
                required: !!(job as any)?.assignment_required,
                type: ((job as any)?.assignment_type || 'text_only') as any,
                description: String((job as any)?.assignment_description || ''),
              }
            : null
        }
        onFirstStepComplete={async (data) => {
          try {
            const name = String(data.candidate_name || '').trim()
            const email = String(data.candidate_email || '').trim()
            if (!applicationId && name && email) {
              const res = await beginApplication({ jobId, candidateName: name, candidateEmail: email })
              if (!res.error) {
                setApplicationId(res.applicationId)
                return res.applicationId
              }
            }
          } catch {}
        }}
      />

      {submitting && (
        <div className='fixed inset-0 bg-black/30 flex items-center justify-center'>
          <Card className='p-6'>
            <p className='text-gray-900 font-medium'>Submitting…</p>
            <p className='text-sm text-gray-600'>Please don’t close this tab.</p>
          </Card>
        </div>
      )}
    </div>
  )
}


