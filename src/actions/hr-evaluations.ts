
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addHrEvaluation(
  applicationId: string, 
  data: {
    hr_score: number;
    hr_notes: string;
    hr_decision: string;
  }
) {
  const supabase = createClient()
  
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
