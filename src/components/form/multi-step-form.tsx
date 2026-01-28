'use client';

import React, { useState, useEffect } from 'react';
import type { MultiStepFormProps, FormData, FormValue } from '@/types/form';
import { FormStepComponent } from './form-step';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { recordProgress, saveProgress } from '@/actions/applications';
import { AssignmentStep, type AssignmentConfig, type AssignmentData } from '@/components/applicant/AssignmentStep'
import { Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

import { useTranslations } from 'next-intl';

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  onComplete,
  rtl = false,
  applicationId,
  jobFormId,
  onVoiceUploadComplete,
  onFileUploadComplete,
  onFirstStepComplete,
  assignmentConfig
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null)
  const [effectiveApplicationId, setEffectiveApplicationId] = useState<string | null>(applicationId || null)
  const [isSaving, setIsSaving] = useState(false)
  const { addToast } = useToast()

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleFieldChange = (fieldId: string, value: FormValue) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error when user starts typing/changing
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: ''
      }));
    }
  };

  useEffect(() => {
    // Keep internal state in sync when parent provides/updates an applicationId.
    if (applicationId && applicationId !== effectiveApplicationId) {
      setEffectiveApplicationId(applicationId)
    }
  }, [applicationId, effectiveApplicationId])

  useEffect(() => {
    const id = steps[currentStep]?.id
    if (effectiveApplicationId && id && id !== 'job') {
      recordProgress(effectiveApplicationId, id, 'enter', { index: currentStep }).catch(() => {})
    }
  }, [currentStep, effectiveApplicationId, steps])

  const validateCurrentStep = (): boolean => {
    const step = steps[currentStep];
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    // Assignment step is validated inside AssignmentStep component
    if (step.id === 'assignment') {
      return true
    }

    step.fields.forEach(field => {
      const value = formData[field.id];

      // Block navigation while uploads are in progress for this step
      if ((field.type === 'voice' || field.type === 'file') && value && typeof value === 'object' && (value as any).uploading) {
        newErrors[field.id] = 'Upload in progress. Please wait…'
        isValid = false
        return
      }
      
      // Check required fields based on type
      if (field.required) {
        if (field.type === 'voice' && !value) {
          newErrors[field.id] = 'Voice recording is required';
          isValid = false;
          return;
        }
        if (field.type === 'file' && !value) {
          newErrors[field.id] = 'File upload is required';
          isValid = false;
          return;
        }
        if ((field.type === 'text' || field.type === 'textarea' || field.type === 'url' || field.type === 'select' || field.type === 'email' || field.type === 'tel' || field.type === 'number' || field.type === 'date')) {
          const isEmpty = !value || (typeof value === 'string' && value.trim() === '')
          if (isEmpty) {
            newErrors[field.id] = 'This field is required';
            isValid = false;
            return;
          }
        }

      }

      // Skip validation if field is empty and not required
      if (!value || value === '') return;

      // Validate number fields
      if (field.type === 'number' && typeof value === 'number') {
        if (field.validation?.min !== undefined && value < field.validation.min) {
          newErrors[field.id] = `Value must be at least ${field.validation.min}`;
          isValid = false;
        }
        if (field.validation?.max !== undefined && value > field.validation.max) {
          newErrors[field.id] = `Value must be at most ${field.validation.max}`;
          isValid = false;
        }
      }

      // Validate text patterns
      if (field.type === 'text' && typeof value === 'string' && field.validation?.pattern) {
        if (!field.validation.pattern.test(value)) {
          newErrors[field.id] = field.validation.message || 'Invalid format';
          isValid = false;
        }
      }

      // Validate URL format
      if (field.type === 'url' && typeof value === 'string' && value) {
        try {
          new URL(value);
        } catch {
          newErrors[field.id] = 'Please enter a valid URL (including http:// or https://)';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return

    const stepId = steps[currentStep]?.id
    const nextStepId = currentStep < steps.length - 1 ? steps[currentStep + 1]?.id : null
    let appIdForTracking: string | null = effectiveApplicationId

    // Ensure we have an applicationId as soon as the candidate finishes personal info.
    // Without this, progress events for later steps can't be linked and tracking becomes "unknown".
    if (!effectiveApplicationId && typeof onFirstStepComplete === 'function' && stepId === 'candidate') {
      try {
        const maybe = await onFirstStepComplete(formData)
        if (typeof maybe === 'string' && maybe) {
          setEffectiveApplicationId(maybe)
          appIdForTracking = maybe
        }
      } catch {}
    }

    // Record progress with richer meta so admins can see what happened even if answers aren't submitted.
    if (appIdForTracking && stepId) {
      setIsSaving(true)
      const step = steps[currentStep]
      const answeredFieldIds = (step?.fields || [])
        .map((f) => f.id)
        .filter((fid) => {
          const v = (formData as any)?.[fid]
          if (v == null) return false
          if (typeof v === 'string') return v.trim() !== ''
          if (typeof v === 'boolean') return v === true
          return true
        })

      await recordProgress(appIdForTracking, stepId, 'next', {
        index: currentStep,
        nextStepId,
        totalFields: (step?.fields || []).length,
        answeredCount: answeredFieldIds.length,
        answeredFieldIds: answeredFieldIds.slice(0, 50),
      }).catch(() => {})

      // Progressive Saving: Save answers for the current step
      if (stepId !== 'job' && stepId !== 'review') {
        const currentStepAnswers = step.fields.map(field => {
          const v = formData[field.id]
          if (field.type === 'voice') {
             // Voice data is stored as an object
             return { questionId: field.id, value: null, voiceData: v || null }
          }
          if (field.type === 'file') {
             // File URL is stored as string
             return { questionId: field.id, value: typeof v === 'string' ? v : null, voiceData: null }
          }
          return { questionId: field.id, value: v == null ? null : String(v), voiceData: null }
        })

        await saveProgress({
          applicationId: appIdForTracking,
          answers: currentStepAnswers
        }).then((res) => {
          if (res.success) {
            addToast('success', 'Page saved successfully', 2000)
          }
        }).catch(err => console.error('Progressive save failed:', err))
      }
      setIsSaving(false)
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      return
    }

    onComplete({
      ...formData,
      ...(assignmentData ? { assignment: assignmentData as any } : {}),
    })
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(0);
    setFormData({});
    setErrors({});
  };

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className='min-h-screen bg-gray-50 py-8 px-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>SmartRecruit AI - Job Application</h1>
          <p className='text-gray-600'>
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className='mb-8'>
          <Progress value={progress} className='w-full' />
          <div className='flex justify-between mt-2 text-sm text-gray-500'>
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Form Step / Review */}
        <div className='mb-8'>
          {steps[currentStep].id === 'assignment' ? (
            <AssignmentStep
              assignmentConfig={
                (assignmentConfig as AssignmentConfig) || {
                  enabled: true,
                  required: false,
                  type: 'text_only',
                  description: '',
                }
              }
              initialData={assignmentData || undefined}
              onPrevious={handlePrevious}
              onNext={(data) => {
                setAssignmentData(data)
                setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
              }}
            />
          ) : steps[currentStep].id !== 'review' ? (
            <FormStepComponent
              step={steps[currentStep]}
              formData={formData}
              onFieldChange={handleFieldChange}
              rtl={rtl}
              errors={errors}
              applicationId={effectiveApplicationId || undefined}
              jobFormId={jobFormId}
              onVoiceUploadComplete={onVoiceUploadComplete}
              onFileUploadComplete={onFileUploadComplete}
            />
          ) : (
            <div className='w-full max-w-3xl mx-auto space-y-6'>
              <div className='bg-white border rounded-xl shadow-sm'>
                <div className='px-6 pt-6'>
                  <h2 className='text-xl font-semibold text-gray-900'>Review & Submit</h2>
                  <p className='text-sm text-gray-600'>Please review your information before submitting.</p>
                </div>
                <div className='p-6 space-y-6'>
                  <div className='rounded-xl border bg-white'>
                    <div className='border-b px-4 py-3'>
                      <h3 className='text-sm font-semibold text-gray-800'>Your Answers</h3>
                    </div>
                    <div className='p-4 space-y-4'>
                      {steps
                        .filter(s => s.id !== 'job' && s.id !== 'review')
                        .flatMap(s => s.fields)
                        .filter(f =>
                          ['text', 'textarea', 'number', 'select', 'date', 'email', 'tel', 'url'].includes(f.type)
                        )
                        .filter(f => formData[f.id] != null && String(formData[f.id]).trim() !== '')
                        .map(f => {
                          const v = formData[f.id]
                          const isUrl = f.type === 'url' && typeof v === 'string' && /^https?:\/\//i.test(v)
                          return (
                            <div key={f.id} className='rounded-lg border bg-gray-50 p-4'>
                              <p className='text-xs font-medium text-gray-500'>{f.label}</p>
                              {isUrl ? (
                                <a
                                  href={String(v)}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='mt-2 block text-sm text-blue-700 hover:underline break-all'
                                >
                                  {String(v)}
                                </a>
                              ) : (
                                <p className='mt-2 text-sm text-gray-900 whitespace-pre-wrap'>{String(v)}</p>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  <div className='rounded-xl border bg-white'>
                    <div className='border-b px-4 py-3'>
                      <h3 className='text-sm font-semibold text-gray-800'>Media & Files</h3>
                    </div>
                    <div className='p-4 space-y-4'>
                      {steps
                        .filter(s => s.id !== 'job' && s.id !== 'review')
                        .flatMap(s => s.fields)
                        .filter(f => ['voice', 'file'].includes(f.type))
                        .filter(f => formData[f.id] != null)
                        .map(f => {
                          const v = formData[f.id]
                          const voiceUrl =
                            v && typeof v === 'object' ? ((v as any).audio_url || (v as any).url || null) : null
                          const fileUrl = typeof v === 'string' ? v : null
                          const fileName =
                            v && typeof v === 'object' && 'name' in (v as any) ? String((v as any).name) : fileUrl

                          return (
                            <div key={f.id} className='rounded-lg border bg-gray-50 p-4'>
                              <p className='text-xs font-medium text-gray-500'>{f.label}</p>
                              <div className='mt-3'>
                                {f.type === 'voice' ? (
                                  voiceUrl ? (
                                    <audio controls src={voiceUrl} className='w-full' />
                                  ) : (
                                    <p className='text-sm text-gray-700'>—</p>
                                  )
                                ) : f.type === 'file' ? (
                                  fileUrl ? (
                                    <a
                                      href={fileUrl}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-sm text-blue-700 hover:underline break-all'
                                    >
                                      {fileName}
                                    </a>
                                  ) : (
                                    <p className='text-sm text-gray-700'>—</p>
                                  )
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  {assignmentData && (
                    <div className='rounded-xl border bg-white'>
                      <div className='border-b px-4 py-3'>
                        <h3 className='text-sm font-semibold text-gray-800'>Assignment</h3>
                      </div>
                      <div className='p-4 space-y-4'>
                        <div className='rounded-lg border bg-gray-50 p-4'>
                          <p className='text-xs font-medium text-gray-500'>Text</p>
                          <p className='mt-2 text-sm text-gray-900 whitespace-pre-wrap'>{assignmentData.text_fields || '—'}</p>
                        </div>
                        {assignmentData.link_fields?.length > 0 && (
                          <div className='rounded-lg border bg-gray-50 p-4'>
                            <p className='text-xs font-medium text-gray-500'>Links</p>
                            <div className='mt-2 space-y-2'>
                              {assignmentData.link_fields.map((l) => (
                                <a
                                  key={l}
                                  href={l}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='block text-sm text-blue-700 hover:underline break-all'
                                >
                                  {l}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className='flex justify-between items-center max-w-2xl mx-auto'>
          {/* Previous button removed to enforce forward-only navigation */}
          <div className='w-[100px]'></div>

          <div className='flex gap-2'>
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <Button onClick={() => { void handleNext() }} disabled={steps[currentStep].id === 'assignment' || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {steps[currentStep].id === 'job'
              ? 'Apply'
              : isLastStep
                ? 'Submit Application'
                : 'Next'}
            {!isSaving && <ChevronRight className='w-4 h-4 ms-2 rtl:rotate-180' />}
          </Button>
        </div>

        {/* Start Over Button - Removed to enforce forward-only navigation */}
      </div>
    </div>
  );
};
