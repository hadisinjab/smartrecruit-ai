
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireReviewerOrAbove } from '@/utils/authz'
import { logAdminEvent } from '@/actions/activity'

export async function addHrEvaluation(
  applicationId: string, 
  data: {
    hr_score: number;
    hr_notes: string;
    hr_decision: string;
    next_action_date?: string | null;
  }
) {
  const supabase = createClient()
  const session = await requireReviewerOrAbove()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Enforce next_action_date for interview/offer decisions (date-only: YYYY-MM-DD)
  const decision = String(data.hr_decision || '').toLowerCase()
  const needsDate = decision === 'interview' || decision === 'approve'
  if (needsDate) {
    const v = data.next_action_date
    if (!v || typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new Error('Next action date is required for Interview/Offer decisions.')
    }
  } else {
    // Keep DB clean: if decision doesn't need a date, clear it.
    data.next_action_date = null
  }

  // Admins can only evaluate applications for their own job forms
  if (session.role === 'admin') {
    const { data: appOwner, error: appOwnerError } = await supabase
      .from('applications')
      .select('job_forms!inner(created_by)')
      .eq('id', applicationId)
      .single()

    const ownerId = (appOwner as any)?.job_forms?.created_by
    if (appOwnerError || ownerId !== user.id) {
      throw new Error('Access denied')
    }
  }
  
  // Check if evaluation already exists for this application
  const { data: existing } = await supabase
    .from('hr_evaluations')
    .select('id')
    .eq('application_id', applicationId)
    .single()

  let error;
  
  if (existing) {
    // Update existing evaluation
    const { error: updateError } = await supabase
      .from('hr_evaluations')
      .update(data)
      .eq('application_id', applicationId)
    error = updateError;
  } else {
    // Insert new evaluation
    const { error: insertError } = await supabase
      .from('hr_evaluations')
      .insert({
        application_id: applicationId,
        ...data
      })
    error = insertError;
  }

  if (error) {
    console.error('Error saving HR evaluation:', error)
    throw new Error('Failed to save HR evaluation')
  }

  const { data: appRow } = await supabase
    .from('applications')
    .select('job_form_id')
    .eq('id', applicationId)
    .single()

  await logAdminEvent({
    action: existing ? 'evaluation.update' : 'evaluation.create',
    entityType: 'evaluation',
    entityId: applicationId,
    jobFormId: appRow?.job_form_id ?? null,
    applicationId,
    metadata: {
      decision: data.hr_decision,
      score: data.hr_score,
    },
  })

  revalidatePath(`/admin/candidates/${applicationId}`)
  revalidatePath('/admin/evaluations')
}

export async function getHrEvaluation(applicationId: string) {
  const supabase = createClient()
  await requireReviewerOrAbove()
  
  const { data, error } = await supabase
    .from('hr_evaluations')
    .select('*')
    .eq('application_id', applicationId)
    .single()
    
  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error fetching HR evaluation:', error)
  }
  
  return data;
}
