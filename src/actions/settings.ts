'use server'

import { createClient } from '@/utils/supabase/server'
import { SystemSettings } from '@/types/admin'
import { requireStaff, requireSuperAdmin } from '@/utils/authz'

const DEFAULT_SETTINGS: SystemSettings = {
  email: {
    smtpHost: 'smtp.smartrecruit.com',
    smtpPort: 587,
    smtpUsername: 'noreply@smartrecruit.com',
    smtpPassword: '',
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
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const supabase = createClient()
  // Staff (super-admin/admin/reviewer) can view settings; only super-admin can update.
  await requireStaff()

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')

    if (error) {
      console.error('Error fetching system settings:', error)
      return DEFAULT_SETTINGS
    }

    if (!data || data.length === 0) {
      return DEFAULT_SETTINGS
    }

    const settings: any = { ...DEFAULT_SETTINGS }

    data.forEach((row: any) => {
      try {
        if (row.key in settings) {
          settings[row.key] = JSON.parse(row.value)
        }
      } catch (e) {
        console.error(`Error parsing setting for key ${row.key}:`, e)
      }
    })

    return settings as SystemSettings
  } catch (error) {
    console.error('Unexpected error in getSystemSettings:', error)
    return DEFAULT_SETTINGS
  }
}

export async function updateSystemSettings(settings: SystemSettings): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  await requireSuperAdmin()

  try {
    const updates = Object.keys(settings).map(key => ({
      key,
      value: JSON.stringify(settings[key as keyof SystemSettings]),
      description: `Settings for ${key} module`,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('system_settings')
      .upsert(updates)

    if (error) {
      console.error('Error updating system settings:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in updateSystemSettings:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
