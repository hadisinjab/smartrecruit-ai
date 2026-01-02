import type { ReactNode } from 'react';

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'textarea' | 'voice' | 'file' | 'url' | 'select';
  label: string;
  placeholder?: string;
  required?: boolean;
  pageNumber?: number; // Page number for multi-step form
  options?: (string | { label: string; value: string })[]; // For select dropdown options
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
    maxFileSize?: number; // in MB
    acceptedTypes?: string[]; // e.g., ['application/pdf', 'application/msword']
  };
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  // Optional custom content for steps (used by apply "Job Overview" step).
  content?: ReactNode;
  fields: FormField[];
}

export type FormValue = string | number | boolean | File | null | Record<string, any>;

export interface FormData {
  [key: string]: FormValue;
}

export interface MultiStepFormProps {
  steps: FormStep[];
  onComplete: (data: FormData) => void;
  rtl?: boolean;
  applicationId?: string | null;
  jobFormId?: string;
  onVoiceUploadComplete?: (info: any) => void;
  onFileUploadComplete?: (info: any) => void;
  onFirstStepComplete?: (data: FormData) => string | null | void | Promise<string | null | void>;
  assignmentConfig?: {
    enabled: boolean
    required: boolean
    type: 'text_only' | 'text_and_links'
    description: string
  } | null;
}

export interface QuestionComponentProps {
  field: FormField;
  value: FormValue;
  onChange: (value: FormValue) => void;
  rtl?: boolean;
  error?: string;
  // Optional context for uploads (public apply flow)
  applicationId?: string;
  jobFormId?: string;
  onUploadComplete?: (questionId: string, info: any) => void;
}
