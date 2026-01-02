'use client';

import React from 'react';
import type { FormStep, FormData, FormValue } from '@/types/form';
import { TextQuestion, NumberQuestion, TextareaQuestion, VoiceQuestion, FileUploadQuestion, URLQuestion, SelectQuestion } from './questions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FormStepComponentProps {
  step: FormStep;
  formData: FormData;
  onFieldChange: (fieldId: string, value: FormValue) => void;
  rtl?: boolean;
  errors?: { [key: string]: string };
  // Additional props for voice questions
  applicationId?: string;
  jobFormId?: string;
  onVoiceUploadComplete?: (questionId: string, audioJson: any) => void;
  // Additional props for file upload questions
  onFileUploadComplete?: (questionId: string, fileUrl: string) => void;
}

export const FormStepComponent: React.FC<FormStepComponentProps> = ({
  step,
  formData,
  onFieldChange,
  rtl = false,
  errors = {},
  applicationId,
  jobFormId,
  onVoiceUploadComplete,
  onFileUploadComplete
}) => {
  const renderQuestion = (field: any) => {
    const commonProps = {
      field,
      value: formData[field.id] || (field.type === 'voice' ? false : field.type === 'file' ? null : field.type === 'select' ? '' : ''),
      onChange: (value: FormValue) => onFieldChange(field.id, value),
      rtl,
      error: errors[field.id],
      // Pass additional props for voice questions
      ...(field.type === 'voice' && {
        applicationId,
        jobFormId,
        onUploadComplete: onVoiceUploadComplete
      }),
      // Pass additional props for file upload questions
      ...(field.type === 'file' && {
        applicationId,
        jobFormId,
        onUploadComplete: onFileUploadComplete
      })
    };

    switch (field.type) {
      case 'text':
        return <TextQuestion key={field.id} {...commonProps} />;
      case 'number':
        return <NumberQuestion key={field.id} {...commonProps} />;
      case 'textarea':
        return <TextareaQuestion key={field.id} {...commonProps} />;
      case 'select':
        return <SelectQuestion key={field.id} {...commonProps} />;
      case 'voice':
        return <VoiceQuestion key={field.id} {...commonProps} />;
      case 'file':
        return <FileUploadQuestion key={field.id} {...commonProps} />;
      case 'url':
        return <URLQuestion key={field.id} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader className='text-start'>
        <CardTitle>{step.title}</CardTitle>
        {step.description && (
          <CardDescription>{step.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className='space-y-6'>
        {step.content}
        {step.fields.map(renderQuestion)}
      </CardContent>
    </Card>
  );
};
