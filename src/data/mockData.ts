import { Job, Candidate, Evaluation, DashboardStats, AdminUser, IncompleteApplication, ActivityLogEntry, SystemSettings } from '@/types/admin';

// Mock Admin Users (Extended for User Management)
export const mockAdminUsers: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@smartrecruit.com',
    role: 'super-admin',
    avatar: '/avatars/sarah.jpg',
    lastLogin: '2025-01-17T09:15:00Z',
    isActive: true,
    createdAt: '2024-06-15T10:30:00Z'
  },
  {
    id: 'admin-2',
    name: 'Michael Chen',
    email: 'michael.chen@smartrecruit.com',
    role: 'admin',
    avatar: '/avatars/michael.jpg',
    lastLogin: '2025-01-16T16:45:00Z',
    isActive: true,
    createdAt: '2024-07-20T14:20:00Z'
  },
  {
    id: 'admin-3',
    name: 'Lisa Park',
    email: 'lisa.park@smartrecruit.com',
    role: 'reviewer',
    avatar: '/avatars/lisa.jpg',
    lastLogin: '2025-01-17T11:30:00Z',
    isActive: true,
    createdAt: '2024-08-10T09:15:00Z'
  },
  {
    id: 'admin-4',
    name: 'David Kim',
    email: 'david.kim@smartrecruit.com',
    role: 'admin',
    avatar: '/avatars/david.jpg',
    lastLogin: '2025-01-15T14:20:00Z',
    isActive: false,
    createdAt: '2024-09-05T16:45:00Z'
  },
  {
    id: 'admin-5',
    name: 'Emma Wilson',
    email: 'emma.wilson@smartrecruit.com',
    role: 'reviewer',
    avatar: '/avatars/emma.jpg',
    lastLogin: '2025-01-14T08:30:00Z',
    isActive: true,
    createdAt: '2024-10-12T12:00:00Z'
  }
];

// Mock Jobs
export const mockJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'full-time',
    status: 'active',
    salary: {
      min: 120000,
      max: 160000,
      currency: 'USD'
    },
    description: 'We are looking for a Senior Frontend Developer to join our growing engineering team...',
    requirements: [
      '5+ years of React experience',
      'TypeScript proficiency',
      'Experience with Next.js',
      'Strong understanding of CSS and responsive design'
    ],
    benefits: [
      'Health Insurance',
      '401k matching',
      'Flexible work hours',
      'Stock options'
    ],
    postedDate: '2025-01-10T00:00:00Z',
    deadline: '2025-02-10T00:00:00Z',
    applicantsCount: 45,
    hiringManager: 'Mike Chen'
  },
  {
    id: 'job-2',
    title: 'Product Manager',
    department: 'Product',
    location: 'New York, NY',
    type: 'full-time',
    status: 'active',
    salary: {
      min: 140000,
      max: 180000,
      currency: 'USD'
    },
    description: 'Join our product team to drive strategic initiatives...',
    requirements: [
      '3+ years of product management experience',
      'Strong analytical skills',
      'Experience with Agile methodology',
      'Excellent communication skills'
    ],
    benefits: [
      'Health Insurance',
      'Stock options',
      'Professional development budget',
      'Remote work flexibility'
    ],
    postedDate: '2025-01-08T00:00:00Z',
    deadline: '2025-02-08T00:00:00Z',
    applicantsCount: 32,
    hiringManager: 'Lisa Park'
  },
  {
    id: 'job-3',
    title: 'UX/UI Designer',
    department: 'Design',
    location: 'Remote',
    type: 'full-time',
    status: 'active',
    salary: {
      min: 90000,
      max: 120000,
      currency: 'USD'
    },
    description: 'Create beautiful and intuitive user experiences...',
    requirements: [
      '4+ years of UX/UI design experience',
      'Proficiency in Figma and Adobe Creative Suite',
      'Portfolio demonstrating design process',
      'Understanding of user-centered design principles'
    ],
    benefits: [
      'Health Insurance',
      'Home office setup budget',
      'Design conference attendance',
      'Flexible schedule'
    ],
    postedDate: '2025-01-05T00:00:00Z',
    deadline: '2025-02-05T00:00:00Z',
    applicantsCount: 28,
    hiringManager: 'David Kim'
  },
  {
    id: 'job-4',
    title: 'DevOps Engineer',
    department: 'Engineering',
    location: 'Austin, TX',
    type: 'full-time',
    status: 'paused',
    salary: {
      min: 110000,
      max: 140000,
      currency: 'USD'
    },
    description: 'Help us build and maintain scalable infrastructure...',
    requirements: [
      '3+ years of DevOps experience',
      'AWS or Azure certification',
      'Docker and Kubernetes experience',
      'CI/CD pipeline expertise'
    ],
    benefits: [
      'Health Insurance',
      '401k matching',
      'Certification reimbursement',
      'Flexible PTO'
    ],
    postedDate: '2025-01-03T00:00:00Z',
    deadline: '2025-02-03T00:00:00Z',
    applicantsCount: 19,
    hiringManager: 'Alex Rodriguez'
  }
];

// Mock Candidates
export const mockCandidates: Candidate[] = [
  {
    id: 'cand-1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    position: 'Senior Frontend Developer',
    experience: 6,
    status: 'interview',
    appliedDate: '2025-01-15T10:30:00Z',
    lastUpdate: '2025-01-17T14:20:00Z',
    source: 'LinkedIn',
    resumeUrl: '/resumes/john-smith.pdf',
    linkedinUrl: 'https://linkedin.com/in/johnsmith',
    avatar: '/avatars/john.jpg',
    notes: 'Strong technical skills, good cultural fit',
    rating: 4,
    tags: ['React', 'TypeScript', 'Leadership'],
    hrFields: {
      priority: 'high',
      notes: 'Schedule final round interview',
      nextAction: 'Final Interview',
      nextActionDate: '2025-01-20T00:00:00Z'
    }
  },
  {
    id: 'cand-2',
    firstName: 'Emily',
    lastName: 'Johnson',
    email: 'emily.johnson@email.com',
    phone: '+1 (555) 987-6543',
    location: 'New York, NY',
    position: 'Product Manager',
    experience: 4,
    status: 'screening',
    appliedDate: '2025-01-14T09:15:00Z',
    lastUpdate: '2025-01-16T16:45:00Z',
    source: 'Company Website',
    resumeUrl: '/resumes/emily-johnson.pdf',
    portfolioUrl: 'https://emilyjohnson.com',
    avatar: '/avatars/emily.jpg',
    notes: 'Good product sense, needs technical depth assessment',
    rating: 3,
    tags: ['Product Strategy', 'Analytics', 'Agile'],
    hrFields: {
      priority: 'medium',
      notes: 'Request writing sample',
      nextAction: 'Technical Assessment',
      nextActionDate: '2025-01-19T00:00:00Z'
    }
  },
  {
    id: 'cand-3',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 456-7890',
    location: 'Los Angeles, CA',
    position: 'UX/UI Designer',
    experience: 5,
    status: 'offer',
    appliedDate: '2025-01-12T11:20:00Z',
    lastUpdate: '2025-01-17T12:30:00Z',
    source: 'Dribbble',
    resumeUrl: '/resumes/michael-chen.pdf',
    portfolioUrl: 'https://michaelchen.design',
    avatar: '/avatars/michael.jpg',
    notes: 'Excellent portfolio, strong user research skills',
    rating: 5,
    tags: ['UI Design', 'User Research', 'Figma'],
    hrFields: {
      priority: 'high',
      notes: 'Send offer letter',
      nextAction: 'Send Offer',
      nextActionDate: '2025-01-18T00:00:00Z'
    }
  },
  {
    id: 'cand-4',
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'sarah.williams@email.com',
    phone: '+1 (555) 321-0987',
    location: 'Seattle, WA',
    position: 'Senior Frontend Developer',
    experience: 7,
    status: 'rejected',
    appliedDate: '2025-01-10T14:45:00Z',
    lastUpdate: '2025-01-16T10:15:00Z',
    source: 'Referral',
    resumeUrl: '/resumes/sarah-williams.pdf',
    avatar: '/avatars/sarah-w.jpg',
    notes: 'Good candidate but role requirements changed',
    rating: 3,
    tags: ['React', 'Node.js', 'Mentoring'],
    hrFields: {
      priority: 'low',
      notes: 'Keep for future opportunities',
      nextAction: 'Archive',
      nextActionDate: '2025-01-25T00:00:00Z'
    }
  },
  {
    id: 'cand-5',
    firstName: 'David',
    lastName: 'Lee',
    email: 'david.lee@email.com',
    phone: '+1 (555) 654-3210',
    location: 'Chicago, IL',
    position: 'Product Manager',
    experience: 3,
    status: 'applied',
    appliedDate: '2025-01-17T08:30:00Z',
    lastUpdate: '2025-01-17T08:30:00Z',
    source: 'Indeed',
    resumeUrl: '/resumes/david-lee.pdf',
    avatar: '/avatars/david.jpg',
    notes: 'New application, initial review pending',
    rating: 0,
    tags: ['Strategy', 'Analytics'],
    hrFields: {
      priority: 'medium',
      notes: 'Schedule initial screening call',
      nextAction: 'Initial Review',
      nextActionDate: '2025-01-18T00:00:00Z'
    }
  }
];

// Mock Incomplete Applications
export const mockIncompleteApplications: IncompleteApplication[] = [
  {
    ...mockCandidates[0],
    progress: {
      personalInfo: true,
      experience: true,
      documents: false,
      questionnaire: false
    },
    completionPercentage: 65,
    lastActivity: '2025-01-17T14:20:00Z',
    timeSpent: 25
  },
  {
    ...mockCandidates[1],
    progress: {
      personalInfo: true,
      experience: false,
      documents: false,
      questionnaire: false
    },
    completionPercentage: 35,
    lastActivity: '2025-01-16T16:45:00Z',
    timeSpent: 15
  },
  {
    id: 'cand-incomplete-3',
    firstName: 'Alex',
    lastName: 'Rodriguez',
    email: 'alex.rodriguez@email.com',
    phone: '+1 (555) 234-5678',
    location: 'Austin, TX',
    position: 'DevOps Engineer',
    experience: 3,
    status: 'applied',
    appliedDate: '2025-01-16T10:15:00Z',
    lastUpdate: '2025-01-16T10:15:00Z',
    source: 'Company Website',
    resumeUrl: '/resumes/alex-rodriguez.pdf',
    avatar: '/avatars/alex.jpg',
    notes: 'Started application but didn\'t complete',
    rating: 0,
    tags: ['DevOps', 'AWS', 'Kubernetes'],
    hrFields: {
      priority: 'medium',
      notes: 'Follow up on incomplete application',
      nextAction: 'Send reminder email',
      nextActionDate: '2025-01-18T00:00:00Z'
    },
    progress: {
      personalInfo: true,
      experience: true,
      documents: true,
      questionnaire: false
    },
    completionPercentage: 85,
    lastActivity: '2025-01-16T11:30:00Z',
    timeSpent: 42
  },
  {
    id: 'cand-incomplete-4',
    firstName: 'Sophie',
    lastName: 'Williams',
    email: 'sophie.williams@email.com',
    phone: '+1 (555) 345-6789',
    location: 'Los Angeles, CA',
    position: 'UX Designer',
    experience: 4,
    status: 'applied',
    appliedDate: '2025-01-15T14:30:00Z',
    lastUpdate: '2025-01-15T14:30:00Z',
    source: 'LinkedIn',
    portfolioUrl: 'https://sophiewilliams.design',
    avatar: '/avatars/sophie.jpg',
    notes: 'Portfolio submitted, waiting for questionnaire',
    rating: 0,
    tags: ['UX Design', 'Figma', 'User Research'],
    hrFields: {
      priority: 'low',
      notes: 'Pending questionnaire completion',
      nextAction: 'Wait for completion',
      nextActionDate: '2025-01-20T00:00:00Z'
    },
    progress: {
      personalInfo: true,
      experience: true,
      documents: true,
      questionnaire: false
    },
    completionPercentage: 80,
    lastActivity: '2025-01-15T15:45:00Z',
    timeSpent: 38
  }
];

// Mock Activity Log
export const mockActivityLog: ActivityLogEntry[] = [
  {
    id: 'activity-1',
    userId: 'admin-1',
    userName: 'Sarah Johnson',
    userRole: 'super-admin',
    action: 'Created',
    target: 'Senior Frontend Developer',
    targetType: 'job',
    description: 'Created new job posting for Senior Frontend Developer position',
    timestamp: '2025-01-17T15:30:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: 'activity-2',
    userId: 'admin-2',
    userName: 'Michael Chen',
    userRole: 'admin',
    action: 'Updated',
    target: 'John Smith',
    targetType: 'candidate',
    description: 'Updated candidate status from screening to interview',
    timestamp: '2025-01-17T14:45:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  {
    id: 'activity-3',
    userId: 'admin-3',
    userName: 'Lisa Park',
    userRole: 'reviewer',
    action: 'Submitted',
    target: 'Technical Interview - John Smith',
    targetType: 'evaluation',
    description: 'Submitted technical interview evaluation with recommendation: Strong Hire',
    timestamp: '2025-01-17T13:20:00Z',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: 'activity-4',
    userId: 'admin-1',
    userName: 'Sarah Johnson',
    userRole: 'super-admin',
    action: 'Activated',
    target: 'Emma Wilson',
    targetType: 'user',
    description: 'Activated user account for Emma Wilson',
    timestamp: '2025-01-17T12:15:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: 'activity-5',
    userId: 'admin-2',
    userName: 'Michael Chen',
    userRole: 'admin',
    action: 'Exported',
    target: 'Candidates Report',
    targetType: 'system',
    description: 'Exported candidates report in CSV format',
    timestamp: '2025-01-17T11:30:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  },
  {
    id: 'activity-6',
    userId: 'admin-3',
    userName: 'Lisa Park',
    userRole: 'reviewer',
    action: 'Reviewed',
    target: 'Emily Johnson',
    targetType: 'candidate',
    description: 'Reviewed candidate application and added internal notes',
    timestamp: '2025-01-17T10:45:00Z',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: 'activity-7',
    userId: 'admin-1',
    userName: 'Sarah Johnson',
    userRole: 'super-admin',
    action: 'Updated',
    target: 'System Settings',
    targetType: 'system',
    description: 'Updated email notification settings',
    timestamp: '2025-01-17T09:20:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  },
  {
    id: 'activity-8',
    userId: 'admin-4',
    userName: 'David Kim',
    userRole: 'admin',
    action: 'Deactivated',
    target: 'Alex Thompson',
    targetType: 'user',
    description: 'Deactivated user account (no longer with company)',
    timestamp: '2025-01-16T16:30:00Z',
    ipAddress: '192.168.1.103',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
];

// Mock System Settings
export const mockSystemSettings: SystemSettings = {
  email: {
    smtpHost: 'smtp.smartrecruit.com',
    smtpPort: 587,
    smtpUsername: 'noreply@smartrecruit.com',
    smtpPassword: '••••••••••••',
    fromName: 'SmartRecruit AI',
    fromEmail: 'noreply@smartrecruit.com',
    enableNotifications: true
  },
  ai: {
    resumeParsing: false,
    candidateScoring: false,
    interviewScheduling: false,
    smartMatching: false
  },
  security: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false
    },
    sessionTimeout: 480,
    twoFactorRequired: false
  },
  export: {
    defaultFormat: 'csv',
    includePersonalData: false,
    anonymizeData: true
  }
};

// Keep original mockAdminUser for compatibility
export const mockAdminUser: AdminUser = mockAdminUsers[0];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  totalJobs: 24,
  activeJobs: 18,
  totalCandidates: 156,
  newApplications: 12,
  interviewsScheduled: 8,
  offersMade: 3,
  hires: 2,
  rejectionRate: 68,
  averageTimeToHire: 18
};

// Mock Evaluations
export const mockEvaluations: Evaluation[] = [
  {
    id: 'eval-1',
    candidateId: 'cand-1',
    evaluatorId: 'admin-2',
    evaluatorName: 'Mike Chen',
    type: 'technical',
    scores: {
      technical: 4,
      communication: 4,
      problemSolving: 5,
      culture: 4,
      overall: 4
    },
    comments: 'Strong technical foundation, excellent problem-solving skills. Good communication throughout the interview.',
    recommendation: 'hire',
    createdAt: '2025-01-17T11:30:00Z'
  },
  {
    id: 'eval-2',
    candidateId: 'cand-1',
    evaluatorId: 'admin-3',
    evaluatorName: 'Lisa Park',
    type: 'behavioral',
    scores: {
      technical: 3,
      communication: 5,
      problemSolving: 4,
      culture: 5,
      overall: 4
    },
    comments: 'Great cultural fit, strong leadership potential. Excellent communication skills.',
    recommendation: 'strong-hire',
    createdAt: '2025-01-17T14:45:00Z'
  },
  {
    id: 'eval-3',
    candidateId: 'cand-3',
    evaluatorId: 'admin-4',
    evaluatorName: 'David Kim',
    type: 'technical',
    scores: {
      technical: 5,
      communication: 4,
      problemSolving: 5,
      culture: 5,
      overall: 5
    },
    comments: 'Outstanding portfolio and technical skills. Strong user-centered design approach.',
    recommendation: 'strong-hire',
    createdAt: '2025-01-16T15:20:00Z'
  }
];

// Helper functions
export const getCandidateById = (id: string): Candidate | undefined => {
  return mockCandidates.find(candidate => candidate.id === id);
};

export const getJobById = (id: string): Job | undefined => {
  return mockJobs.find(job => job.id === id);
};

export const getEvaluationsByCandidateId = (candidateId: string): Evaluation[] => {
  return mockEvaluations.filter(evaluation => evaluation.candidateId === candidateId);
};

export const getCandidatesByJobId = (jobId: string): Candidate[] => {
  // This would filter candidates by job in a real app
  return mockCandidates;
};

export const getJobsByStatus = (status: string): Job[] => {
  return mockJobs.filter(job => job.status === status);
};

export const getCandidatesByStatus = (status: string): Candidate[] => {
  return mockCandidates.filter(candidate => candidate.status === status);
};

// New helper functions for additional features
export const getIncompleteApplications = (): IncompleteApplication[] => {
  return mockIncompleteApplications;
};

export const getIncompleteApplicationsByJob = (jobId: string): IncompleteApplication[] => {
  return mockIncompleteApplications.filter(app => app.position.includes('Developer') || app.position.includes('Engineer'));
};

export const getAdminUsers = (): AdminUser[] => {
  return mockAdminUsers;
};

export const getAdminUserById = (id: string): AdminUser | undefined => {
  return mockAdminUsers.find(user => user.id === id);
};

export const getActivityLog = (filters?: {
  userId?: string;
  action?: string;
  targetType?: string;
  limit?: number;
}): ActivityLogEntry[] => {
  let filteredLog = [...mockActivityLog];
  
  if (filters?.userId) {
    filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
  }
  
  if (filters?.action) {
    filteredLog = filteredLog.filter(entry => 
      entry.action.toLowerCase().includes(filters.action!.toLowerCase())
    );
  }
  
  if (filters?.targetType) {
    filteredLog = filteredLog.filter(entry => entry.targetType === filters.targetType);
  }
  
  if (filters?.limit) {
    filteredLog = filteredLog.slice(0, filters.limit);
  }
  
  return filteredLog.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};
