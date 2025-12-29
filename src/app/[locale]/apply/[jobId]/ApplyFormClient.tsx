'use client'

import React, { useMemo, useState } from 'react'
import { MultiStepForm } from '@/components/form/multi-step-form'
import type { FormField, FormStep, FormData } from '@/types/form'
import type { ApplyQuestion } from '@/actions/applications'
import { submitApplication, beginApplication } from '@/actions/applications'
import { createClient } from '@/utils/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type ApplyJob = {
  id: string
  title: string
  description: string | null
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

    const s: FormStep[] = [
      {
        id: 'job',
        title: job.title,
        description: job.description || 'Review the job details, then click Apply.',
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
      s.push({
        id: 'media-questions',
        title: 'Uploads & Links',
        description: 'Provide any files, voice responses, or links requested.',
        fields: mediaQuestions.map(toFormField)
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

      // Upload resume if any file-question provided a File
      let resumeUrl: string | null = null
      for (const q of allQuestions) {
        if (q.type !== 'file') continue
        const v = data[q.id]
        if (typeof v === 'string' && v) {
          // Already uploaded by the file question UI
          resumeUrl = v
          break
        }
        if (v && typeof v === 'object' && v instanceof File) {
          const { url, error } = await uploadResume(v, jobId)
          if (error) {
            setSubmitError(error)
            return
          }
          resumeUrl = url
          break
        }
      }

      const answers = allQuestions.map((q) => {
        const v = data[q.id]
        if (q.type === 'voice') {
          // VoiceQuestion stores structured JSON after upload (audio_url, duration, etc.)
          return { questionId: q.id, value: null, voiceData: v || null }
        }
        if (q.type === 'file') {
          // Stored separately as resumeUrl above (MVP)
          return { questionId: q.id, value: resumeUrl, voiceData: null }
        }
        return { questionId: q.id, value: v == null ? null : String(v), voiceData: null }
      })

      const res = await submitApplication({
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
        onFirstStepComplete={async (data) => {
          try {
            const name = String(data.candidate_name || '').trim()
            const email = String(data.candidate_email || '').trim()
            if (!applicationId && name && email) {
              const res = await beginApplication({ jobId, candidateName: name, candidateEmail: email })
              if (!res.error) {
                setApplicationId(res.applicationId)
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
