// Admin-specific types for SmartRecruit AI Admin Dashboard

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'reviewer';
  avatar?: string;
  lastLogin: string;
  isActive: boolean;
  createdAt: string;
  organizationName?: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'paused' | 'closed' | 'draft';
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  benefits: string[];
  postedDate: string;
  deadline: string;
  applicantsCount: number;
  hiringManager: string;
  creatorName?: string; // New field for creator's name
  organizationName?: string; // New field for organization name (Super Admin only)
  evaluation_criteria?: {
    id: string;
    type: string;
    label: string;
    required: boolean;
    pageNumber: number;
    options?: any[];
  }[];
}

export interface Candidate {
  id: string;
  jobFormId?: string;
  submittedAt?: string | null;
  isDuplicate?: boolean;
  lastProgressStep?: string;
  lastProgressAt?: string | null;
  lastProgressEvent?: string;
  lastProgressMeta?: any;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  position: string;
  experience: number;
  age?: number; // Added age field
  // Note: applications table uses 'new' / 'duplicate' early in the funnel too.
  status: 'new' | 'duplicate' | 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  appliedDate: string;
  lastUpdate: string;
  source: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  avatar?: string;
  notes: string;
  rating: number; // 1-5 stars
  tags: string[];
  hrFields: {
    priority: 'low' | 'medium' | 'high';
    notes: string;
    nextAction: string;
    nextActionDate: string;
  };
  // Only populated for Super Admin views
  organizationName?: string;
  jobOwnerName?: string;
  ai_evaluations?: any[];
  answers?: {
    id: string;
    question_id: string;
    value: string | number;
    type: string;
  }[];
}

export interface Evaluation {
  id: string;
  candidateId: string;
  candidateName: string;
  candidatePosition: string;
  evaluatorId: string;
  evaluatorName: string;
  type: string;
  date: string;
  createdAt: string;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    experience: number;
    overall: number;
  };
  notes: string;
  recommendation: string;
  status: string;
}

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  newApplications: number;
  interviewsScheduled: number;
  offersMade: number;
  hires: number;
  rejectionRate: number;
  averageTimeToHire: number;
}

export interface FilterOptions {
  search: string;
  status: string[];
  department: string[];
  location: string[];
  experience: {
    min: number;
    max: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

// New types for additional admin features

export interface IncompleteApplication extends Candidate {
  progress: {
    personalInfo: boolean;
    experience: boolean;
    documents: boolean;
    questionnaire: boolean;
  };
  completionPercentage: number;
  lastActivity: string;
  timeSpent: number; // in minutes
  stoppedAt?: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  targetType: 'candidate' | 'job' | 'user' | 'evaluation' | 'system';
  description: string;
  timestamp: string;
  entityId?: string | null;
  jobFormId?: string | null;
  applicationId?: string | null;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemSettings {
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    fromName: string;
    fromEmail: string;
    enableNotifications: boolean;
  };
  ai: {
    resumeParsing: boolean;
    candidateScoring: boolean;
    interviewScheduling: boolean;
    smartMatching: boolean;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    sessionTimeout: number; // in minutes
    twoFactorRequired: boolean;
  };
  export: {
    defaultFormat: 'csv' | 'xlsx' | 'pdf';
    includePersonalData: boolean;
    anonymizeData: boolean;
  };
}
