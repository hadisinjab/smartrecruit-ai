
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireReviewerOrAdmin } from '@/utils/authz'

export async function addHrEvaluation(
  applicationId: string, 
  data: {
    hr_score: number;
    hr_notes: string;
    hr_decision: string;
  }
) {
  const supabase = createClient()
  const role = await requireReviewerOrAdmin()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  // Admins can only evaluate applications for their own job forms
  if (role === 'admin') {
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

  revalidatePath(`/admin/candidates/${applicationId}`)
  revalidatePath('/admin/evaluations')
}

export async function getHrEvaluation(applicationId: string) {
  const supabase = createClient()
  await requireReviewerOrAdmin()
  
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
