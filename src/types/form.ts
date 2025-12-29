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
  fields: FormField[];
}

export interface FormData {
  [key: string]: string | number | boolean | File | null;
}

export interface MultiStepFormProps {
  steps: FormStep[];
  onComplete: (data: FormData) => void;
  rtl?: boolean;
  applicationId?: string | null;
  jobFormId?: string;
  onVoiceUploadComplete?: (info: any) => void;
  onFileUploadComplete?: (info: any) => void;
  onFirstStepComplete?: (data: FormData) => void;
}

export interface QuestionComponentProps {
  field: FormField;
  value: string | number | boolean | File | null;
  onChange: (value: string | number | boolean | File | null) => void;
  rtl?: boolean;
  error?: string;
}
