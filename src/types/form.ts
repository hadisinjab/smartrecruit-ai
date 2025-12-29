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
  [key: string]: FormValue;
}

// Form values can include structured metadata (e.g., voice recording JSON)
export type FormValue = string | number | boolean | File | null | Record<string, any>;

export interface MultiStepFormProps {
  steps: FormStep[];
  onComplete: (data: FormData) => void;
  rtl?: boolean;
  // Additional props for voice questions
  applicationId?: string;
  jobFormId?: string;
  onVoiceUploadComplete?: (questionId: string, audioJson: any) => void;
  // Additional props for file upload questions
  onFileUploadComplete?: (questionId: string, fileUrl: string) => void;
}

export interface QuestionComponentProps {
  field: FormField;
  value: FormValue;
  onChange: (value: FormValue) => void;
  rtl?: boolean;
  error?: string;
  // Additional props for voice questions
  applicationId?: string;
  jobFormId?: string;
  onUploadComplete?: (questionId: string, audioJson: any) => void;
  // Additional props for file upload questions
  onFileUploadComplete?: (questionId: string, fileUrl: string) => void;
}
