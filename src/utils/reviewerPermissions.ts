import { getSessionInfo, SessionInfo } from '@/utils/authz'

export interface ReviewerPermissions {
  session: SessionInfo
  users: {
    canReadReviewersInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'sameOrganizationReviewersOnly'
  }
  jobForms: {
    canReadInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'sameOrganization'
  }
  applications: {
    canReadInOrganizationWithoutSensitiveData: boolean
    canAddReviewNotes: boolean
    canExportLimitedWithoutContact: boolean
    canReviewAssignedOnly: boolean
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
    canReadLimitedInOrganization: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  extras: {
    canSeeExpectedSalaries: boolean
    canExportWithHiddenSalaries: boolean
    canManageJobForms: boolean
    canChangeSystemSettingsOrRoles: boolean
  }
  questions: {
    canReadInOrganizationJobForms: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationJobForms'
  }
  answers: {
    canReadInOrganizationWithoutSensitiveData: boolean
    canSeeCleanTranscriptsOnly: boolean
    canSeeQualityAndSentimentAnalysis: boolean
    canDownloadAudio: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  resumes: {
    canReadProfessionalDataInOrganization: boolean
    canDownloadOriginal: boolean
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
    canReadOwn: boolean
    canUpdateReadState: boolean
    canCreate: boolean
    canDelete: boolean
    rowScope: 'ownUser'
  }
  activityLog: {
    canReadOwnReviewActivities: boolean
    canTrackOwnProductivityAndPerformance: boolean
    canReviewOwnErrors: boolean
    canAccessSecurityRelatedEntries: boolean
    rowScope: 'ownUser'
  }
  interviews: {
    canReadInOrganization: boolean
    canReadAiAnalysisOnly: boolean
    canAddQualityNotes: boolean
    canDownloadMedia: boolean
    canCreate: boolean
    canDelete: boolean
    rowScope: 'organizationViaApplication'
  }
  externalProfiles: {
    canReadProfessionalDataInOrganization: boolean
    canSeeOriginalLinks: boolean
    canUpdateParsedData: boolean
    canDelete: boolean
    canCompareCandidates: boolean
    rowScope: 'organizationViaApplication'
  }
}

export async function loadReviewerPermissions(): Promise<ReviewerPermissions> {
  const session = await getSessionInfo()
  if (!session || session.role !== 'reviewer') {
    throw new Error('Access denied: Reviewer only.')
  }
  return {
    session,
    users: {
      canReadReviewersInOrganization: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'sameOrganizationReviewersOnly',
    },
    jobForms: {
      canReadInOrganization: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'sameOrganization',
    },
    applications: {
      canReadInOrganizationWithoutSensitiveData: true,
      canAddReviewNotes: true,
      canExportLimitedWithoutContact: true,
      canReviewAssignedOnly: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'organizationViaJobForm',
    },
    aiEvaluations: {
      canReadInOrganization: true,
      canTriggerReevaluation: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    hrEvaluations: {
      canReadLimitedInOrganization: true,
      canCreate: true,
      canUpdate: true,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    extras: {
      canSeeExpectedSalaries: false,
      canExportWithHiddenSalaries: true,
      canManageJobForms: false,
      canChangeSystemSettingsOrRoles: false,
    },
    questions: {
      canReadInOrganizationJobForms: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'organizationJobForms',
    },
    answers: {
      canReadInOrganizationWithoutSensitiveData: true,
      canSeeCleanTranscriptsOnly: true,
      canSeeQualityAndSentimentAnalysis: true,
      canDownloadAudio: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    resumes: {
      canReadProfessionalDataInOrganization: true,
      canDownloadOriginal: false,
      canReparse: false,
      canUpdateParsedData: false,
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
      canReadOwn: true,
      canUpdateReadState: true,
      canCreate: false,
      canDelete: false,
      rowScope: 'ownUser',
    },
    activityLog: {
      canReadOwnReviewActivities: true,
      canTrackOwnProductivityAndPerformance: true,
      canReviewOwnErrors: true,
      canAccessSecurityRelatedEntries: false,
      rowScope: 'ownUser',
    },
    interviews: {
      canReadInOrganization: true,
      canReadAiAnalysisOnly: true,
      canAddQualityNotes: true,
      canDownloadMedia: false,
      canCreate: false,
      canDelete: false,
      rowScope: 'organizationViaApplication',
    },
    externalProfiles: {
      canReadProfessionalDataInOrganization: true,
      canSeeOriginalLinks: false,
      canUpdateParsedData: false,
      canDelete: false,
      canCompareCandidates: true,
      rowScope: 'organizationViaApplication',
    },
  }
}
