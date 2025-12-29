'use client';

import React, { useState } from 'react';
import { MultiStepFormProps, FormData, FormValue } from '@/types/form';
import { FormStepComponent } from './form-step';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export const MultiStepForm: React.FC<MultiStepFormProps> = ({
  steps,
  onComplete,
  rtl = false,
  applicationId,
  jobFormId,
  onVoiceUploadComplete,
  onFileUploadComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  const validateCurrentStep = (): boolean => {
    const step = steps[currentStep];
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    step.fields.forEach(field => {
      const value = formData[field.id];
      
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
        if ((field.type === 'text' || field.type === 'textarea' || field.type === 'url' || field.type === 'select') && (!value || value === '')) {
          newErrors[field.id] = 'This field is required';
          isValid = false;
          return;
        }
        if (field.type === 'number' && (value === '' || value === undefined || value === null)) {
          newErrors[field.id] = 'This field is required';
          isValid = false;
          return;
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

  const handleNext = () => {
    if (validateCurrentStep()) {
      // المرحلة 5️⃣: Auto-save عند الانتقال للصفحة التالية
      // يتم حفظ الإجابات تلقائياً عند الضغط Next
      // (سيتم استدعاء onComplete الذي يحفظ الإجابات)
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Form is complete
        onComplete(formData);
      }
    }
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
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            SmartRecruit AI - Job Application
          </h1>
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

        {/* Form Step */}
        <div className='mb-8'>
          <FormStepComponent
            step={steps[currentStep]}
            formData={formData}
            onFieldChange={handleFieldChange}
            rtl={rtl}
            errors={errors}
            applicationId={applicationId}
            jobFormId={jobFormId}
            onVoiceUploadComplete={onVoiceUploadComplete}
            onFileUploadComplete={onFileUploadComplete}
          />
        </div>

        {/* Navigation */}
        <div className='flex justify-between items-center max-w-2xl mx-auto'>
          {/* Previous button removed */}
          <div className='w-24' />

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

          <Button
            onClick={handleNext}
          >
            {isLastStep ? 'Submit Application' : 'Next'}
            <ChevronRight className='w-4 h-4 ms-2 rtl:rotate-180' />
          </Button>
        </div>

        {/* Start Over Button */}
        <div className='flex justify-center mt-6'>
          <Button
            variant='ghost'
            onClick={handleStartOver}
            className='text-gray-600 hover:text-gray-800'
          >
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
};