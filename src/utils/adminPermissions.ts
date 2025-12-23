import { getSessionInfo, SessionInfo } from '@/utils/authz'

export interface AdminPermissions {
  session: SessionInfo
  users: {
    canReadAllInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'sameOrganization'
  }
  jobForms: {
    canReadAllInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'sameOrganization'
  }
  applications: {
    canReadInOrganization: boolean
    canManageStatusesInOrganization: boolean
    canUseAdvancedFilters: boolean
    canExportLimitedInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaJobForm'
  }
  aiEvaluations: {
    canReadInOrganization: boolean
    canTriggerReevaluation: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  hrEvaluations: {
    canReadInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  extras: {
    canSeeExpectedSalaries: boolean
    canExportData: boolean
    canManageJobForms: boolean
  }
  questions: {
    canReadInOwnJobForms: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'ownJobForms'
  }
  answers: {
    canReadInOrganization: boolean
    canManageAudioAndTranscriptsInOrganization: boolean
    canReviewQualityAndAnalysis: boolean
    canExportLimitedInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  resumes: {
    canReadInOrganization: boolean
    canDownloadInOrganization: boolean
    canReparse: boolean
    canUpdateParsedData: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  organizations: {
    canReadOwnOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'ownOrganization'
  }
  notifications: {
    canReadInScope: boolean
    canCreateForOwnCandidates: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'ownCandidates'
  }
  activityLog: {
    canReadInOrganization: boolean
    canMonitorOwnJobsAndCandidates: boolean
    canReviewEvaluationAndAnalysisErrors: boolean
    canExportLimitedInOrganization: boolean
    canTrackJobFormsPerformance: boolean
    rowScope: 'sameOrganization'
  }
  interviews: {
    canReadInOrganization: boolean
    canDownloadMediaInOrganization: boolean
    canReparseAnalysis: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  externalProfiles: {
    canReadInOrganization: boolean
    canSeeOriginalLinksInOrganization: boolean
    canReparse: boolean
    canUpdateParsedData: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
}

export async function loadAdminPermissions(): Promise<AdminPermissions> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'admin') {
    throw new Error('Access denied: Admin only.')
  }
  return {
    session,
    users: {
      canReadAllInOrganization: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'sameOrganization',
    },
    jobForms: {
      canReadAllInOrganization: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'sameOrganization',
    },
    applications: {
      canReadInOrganization: true,
      canManageStatusesInOrganization: true,
      canUseAdvancedFilters: true,
      canExportLimitedInOrganization: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
      rowScope: 'organizationViaJobForm',
    },
    aiEvaluations: {
      canReadInOrganization: true,
      canTriggerReevaluation: true,
      canUpdate: false,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    hrEvaluations: {
      canReadInOrganization: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    extras: {
      canSeeExpectedSalaries: true,
      canExportData: true,
      canManageJobForms: true,
    },
    questions: {
      canReadInOwnJobForms: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      rowScope: 'ownJobForms',
    },
    answers: {
      canReadInOrganization: true,
      canManageAudioAndTranscriptsInOrganization: true,
      canReviewQualityAndAnalysis: true,
      canExportLimitedInOrganization: true,
      canCreate: false,
      canUpdate: true,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    resumes: {
      canReadInOrganization: true,
      canDownloadInOrganization: true,
      canReparse: true,
      canUpdateParsedData: true,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    organizations: {
      canReadOwnOrganization: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'ownOrganization',
    },
    notifications: {
      canReadInScope: true,
      canCreateForOwnCandidates: true,
      canUpdate: true,
      canDelete: false,
      rowScope: 'ownCandidates',
    },
    activityLog: {
      canReadInOrganization: true,
      canMonitorOwnJobsAndCandidates: true,
      canReviewEvaluationAndAnalysisErrors: true,
      canExportLimitedInOrganization: true,
      canTrackJobFormsPerformance: true,
      rowScope: 'sameOrganization',
    },
    interviews: {
      canReadInOrganization: true,
      canDownloadMediaInOrganization: true,
      canReparseAnalysis: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    externalProfiles: {
      canReadInOrganization: true,
      canSeeOriginalLinksInOrganization: true,
      canReparse: true,
      canUpdateParsedData: true,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
  }
}
