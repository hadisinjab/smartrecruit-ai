
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getJobs() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('job_forms')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching jobs:', error)
    throw new Error('Failed to fetch jobs')
  }

  return data
}

export async function createJob(formData: any) {
  const supabase = createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('job_forms')
    .insert({
      title: formData.title,
      description: formData.description,
      status: formData.status || 'draft',
      created_by: user.id,
      evaluation_criteria: formData.evaluation_criteria || {},
      organization_id: formData.organization_id || null // Handle logic for org if needed
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    throw new Error('Failed to create job')
  }

  revalidatePath('/admin/jobs')
  return data
}

export async function updateJob(id: string, formData: any) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('job_forms')
    .update({
      title: formData.title,
      description: formData.description,
      department: formData.department,
      location: formData.location,
      type: formData.type,
      status: formData.status,
      salary_min: formData.salary_min,
      salary_max: formData.salary_max,
      salary_currency: formData.salary_currency,
      requirements: formData.requirements,
      benefits: formData.benefits,
      deadline: formData.deadline,
      hiring_manager_name: formData.hiring_manager_name,
      evaluation_criteria: formData.evaluation_criteria,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating job:', error)
    throw new Error('Failed to update job')
  }

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
  return data
}

export async function deleteJob(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('job_forms')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting job:', error)
    throw new Error('Failed to delete job')
  }

  revalidatePath('/admin/jobs')
}
