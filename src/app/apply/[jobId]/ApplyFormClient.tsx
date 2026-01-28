'use client'

import React, { useMemo, useState } from 'react'
import { MultiStepForm } from '@/components/form/multi-step-form'
import type { FormField, FormStep, FormData } from '@/types/form'
import type { ApplyQuestion } from '@/actions/applications'
import { submitApplication, beginApplication, saveProgress } from '@/actions/applications'
import { createAssignment } from '@/actions/assignments'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/context/ToastContext';
import { Card } from '@/components/ui/card';
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
  const { addToast } = useToast();
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const allPossibleFields: FormField[] = useMemo(() => [
    {
      id: 'candidate_name',
      type: 'text',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      required: true,
    },
    {
      id: 'candidate_email',
      type: 'text',
      label: 'Email Address',
      placeholder: 'you@example.com',
      required: true,
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email format',
      },
    },
    {
      id: 'candidate_phone',
      type: 'text',
      label: 'Phone Number',
      required: true,
    },
    {
      id: 'candidate_age',
      type: 'number',
      label: 'What is your age?',
      required: true,
    },
    {
      id: 'desired_salary',
      type: 'number',
      label: 'What is your desired salary?',
      required: true,
    },
    {
      id: 'experience',
      type: 'number',
      label: 'How many years of experience do you have?',
      required: true,
    },
    {
      id: 'gender',
      type: 'select',
      label: 'Gender',
      options: ['Male', 'Female', 'Other'],
      required: true,
    },
    {
      id: 'date_of_birth',
      type: 'date',
      label: 'Date of Birth',
      required: true,
    },
    {
      id: 'nationality',
      type: 'text',
      label: 'What is your nationality?',
      required: true,
    },
    {
      id: 'marital_status',
      type: 'select',
      label: 'What is your marital status?',
      options: ['Single', 'Married', 'Divorced', 'Widowed'],
      required: true,
    },
    {
      id: 'photo',
      type: 'file',
      label: 'Please upload your photo',
      required: true,
    },
    {
      id: 'country',
      type: 'text',
      label: 'Country of Residence',
      required: true,
    },
    {
      id: 'city',
      type: 'text',
      label: 'City of Residence',
      required: true,
    },
    {
      id: 'education_level',
      type: 'select',
      label: 'What is your highest education level?',
      options: ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD"],
      required: true,
    },
    {
      id: 'university_name',
      type: 'text',
      label: 'What is the name of your university?',
      required: true,
    },
    {
      id: 'major',
      type: 'text',
      label: 'What is your major?',
      required: true,
    },
    {
      id: 'degree_file',
      type: 'file',
      label: 'Please upload your degree/certificate',
      required: true,
    },
    {
      id: 'languages',
      type: 'text',
      label: 'What languages do you speak? (comma-separated)',
      required: true,
    },
    {
      id: 'available_start_date',
      type: 'select',
      label: 'When are you available to start?',
      options: ['Immediately', 'After 1 week', 'After 2 weeks', 'After 1 month', 'More than 1 month'],
      required: true,
    },
  ], []);

  const processAndUploadFiles = async (data: FormData, jobId: string) => {
    const processedData = { ...data };
    const fileFields = allPossibleFields.filter(f => f.type === 'file');

    for (const field of fileFields) {
      const file = processedData[field.id];
      if (file instanceof File) {
        const { url, error } = await uploadResume(file, jobId);
        if (error) {
          throw new Error(`Error uploading ${field.label}: ${error}`);
        }
        processedData[field.id] = url;
      }
    }
    return processedData;
  };

  const steps: FormStep[] = useMemo(() => {

    const defaultFields = ['candidate_name', 'candidate_email', 'desired_salary'];
    const enabledFields =
      (job as any).enabled_fields && (job as any).enabled_fields.length > 0
        ? (job as any).enabled_fields
        : defaultFields;
    const dynamicBaseFields = allPossibleFields.filter(field =>
      (enabledFields as string[]).includes(field.id)
    );

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
    ]

    s.splice(1, 0, {
      id: 'candidate',
      title: 'Your Information',
      description: 'Please provide your contact and basic information.',
      fields: dynamicBaseFields
    })

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
    const assignmentTiming = (job as any)?.assignment_timing
    if (assignmentEnabled && assignmentTiming === 'before') {
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
  }, [job, textQuestions, mediaQuestions])

  const allQuestions = useMemo(() => [...textQuestions, ...mediaQuestions], [textQuestions, mediaQuestions])

  const handleComplete = async (data: FormData) => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const candidateName = String(data.candidate_name || '')
      const candidateEmail = String(data.candidate_email || '')

      let appId = applicationId;
      if (!appId) {
        setSubmitError('Could not create an application. Please go back and try again.');
        setSubmitting(false);
        return;
      }

      if (!appId) {
        setSubmitError('Failed to create application.')
        return
      }

      const finalData = await processAndUploadFiles(data, jobId);

      const answers = allQuestions.map((q) => {
        const v = finalData[q.id]
        if (q.type === 'voice') {
          // VoiceQuestion stores structured JSON after upload (audio_url, duration, etc.)
          return { questionId: q.id, value: null, voiceData: v || null }
        }
        // For file type, the URL is already in finalData
        return { questionId: q.id, value: v == null ? null : String(v), voiceData: null }
      })

      // Save answers
      await saveProgress({ applicationId: appId, answers });

      // Submit application (final step)
      // Filter finalData to only include static fields defined in allPossibleFields
      // This prevents dynamic question IDs (UUIDs) from being sent as columns to the applications table
      const staticData: Record<string, any> = {};
      allPossibleFields.forEach(field => {
        if (finalData[field.id] !== undefined) {
          staticData[field.id] = finalData[field.id];
        }
      });
      
      const res = await submitApplication({
        applicationId: appId,
        ...staticData,
      });

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
            application_id: appId,
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
            const name = String(data.candidate_name || '').trim();
            const email = String(data.candidate_email || '').trim();

            if (!applicationId && name && email) {
              const processedData = await processAndUploadFiles(data, jobId);
              const res = await beginApplication({
                jobId,
                ...processedData,
              });

              if (res.error || !res.applicationId) {
                setSubmitError(res.error || 'An unknown error occurred and the application could not be created.');
              } else {
                setApplicationId(res.applicationId);
                addToast('success', 'Data saved successfully');
                return res.applicationId;
              }
            }
          } catch (e: any) {
            setSubmitting(false);
            setSubmitError(e.message || 'An unexpected error occurred.');
          }
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


