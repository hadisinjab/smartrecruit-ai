import { getSessionInfo, SessionInfo } from '@/utils/authz'

export interface SuperAdminPermissions {
  session: SessionInfo
  users: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  jobForms: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  applications: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canManageStatusesAndDuplicates: boolean
    canExportAllWithAdvancedStats: boolean
    canArchiveAccordingToPolicies: boolean
    rowScope: 'all'
  }
  aiEvaluations: {
    canReadAll: boolean
    canTriggerReevaluation: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  hrEvaluations: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  extras: {
    canSeeExpectedSalaries: boolean
    canExportAllData: boolean
    canManageAdminsAndReviewers: boolean
  }
  questions: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  answers: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canManageAudioAndAnalysis: boolean
    canReprocessTranscriptsAndAi: boolean
    canExportAllWithAdvancedStats: boolean
    rowScope: 'all'
  }
  resumes: {
    canReadAll: boolean
    canDownloadAll: boolean
    canReparse: boolean
    canUpdateParsedData: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  organizations: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  notifications: {
    canReadAll: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  activityLog: {
    canReadAll: boolean
    canMonitorSystemAndUsers: boolean
    canManageRetentionAndCompliance: boolean
    canExportAllWithAdvancedReports: boolean
    canReviewSecurityAndThreats: boolean
    rowScope: 'all'
  }
  interviews: {
    canReadAll: boolean
    canDownloadAllMedia: boolean
    canReparseAnalysis: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'all'
  }
  externalProfiles: {
    canReadAll: boolean
    canDownloadAllLinks: boolean
    canReparse: boolean
    canUpdateParsedData: boolean
    canDelete: boolean
    canViewTrustAndQualityInfo: boolean
    rowScope: 'all'
  }
}

export async function loadSuperAdminPermissions(): Promise<SuperAdminPermissions> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'super-admin') {
    throw new Error('Access denied: Super Admin only.')
  }
  return {
    session,
    users: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    jobForms: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    applications: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canManageStatusesAndDuplicates: true,
      canExportAllWithAdvancedStats: true,
      canArchiveAccordingToPolicies: true,
      rowScope: 'all',
    },
    aiEvaluations: {
      canReadAll: true,
      canTriggerReevaluation: true,
      canUpdate: false,
      canDelete: true,
      rowScope: 'all',
    },
    hrEvaluations: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    extras: {
      canSeeExpectedSalaries: true,
      canExportAllData: true,
      canManageAdminsAndReviewers: true,
    },
    questions: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    answers: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canManageAudioAndAnalysis: true,
      canReprocessTranscriptsAndAi: true,
      canExportAllWithAdvancedStats: true,
      rowScope: 'all',
    },
    resumes: {
      canReadAll: true,
      canDownloadAll: true,
      canReparse: true,
      canUpdateParsedData: true,
      canDelete: true,
      rowScope: 'all',
    },
    organizations: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    notifications: {
      canReadAll: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    activityLog: {
      canReadAll: true,
      canMonitorSystemAndUsers: true,
      canManageRetentionAndCompliance: true,
      canExportAllWithAdvancedReports: true,
      canReviewSecurityAndThreats: true,
      rowScope: 'all',
    },
    interviews: {
      canReadAll: true,
      canDownloadAllMedia: true,
      canReparseAnalysis: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'all',
    },
    externalProfiles: {
      canReadAll: true,
      canDownloadAllLinks: true,
      canReparse: true,
      canUpdateParsedData: true,
      canDelete: true,
      canViewTrustAndQualityInfo: true,
      rowScope: 'all',
    },
  }
}
