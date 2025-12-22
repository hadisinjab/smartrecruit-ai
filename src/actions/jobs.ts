
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { Job } from '@/types/admin';
import { requireAdminOrSuper, requireJobOwnerOrSuper } from '@/utils/authz'

export async function getJobs(): Promise<Job[]> {
  const supabase = createClient()
  const role = await requireAdminOrSuper()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('job_forms')
    .select('*')
    .order('created_at', { ascending: false })

  // Admin يرى وظائفه فقط؛ Super Admin يرى كل الوظائف
  if (role === 'admin') {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching jobs:', error)
    throw new Error('Failed to fetch jobs')
  }

  // Fetch applicant counts for all jobs
  // This is a simplified approach; for large datasets, use a view or RPC
  const { data: appCounts, error: countError } = await supabase
    .from('applications')
    .select('job_id')

  const counts: Record<string, number> = {};
  if (appCounts) {
    appCounts.forEach((app: any) => {
      counts[app.job_id] = (counts[app.job_id] || 0) + 1;
    });
  }

  return data.map((job: any) => ({
    id: job.id,
    title: job.title,
    department: job.department || 'General',
    location: job.location || 'Remote',
    type: job.type || 'full-time',
    status: job.status,
    salary: {
      min: job.salary_min || 0,
      max: job.salary_max || 0,
      currency: job.salary_currency || 'USD'
    },
    description: job.description || '',
    requirements: job.requirements || [],
    benefits: job.benefits || [],
    postedDate: job.created_at,
    deadline: job.deadline || '',
    applicantsCount: counts[job.id] || 0,
    hiringManager: job.hiring_manager_name || 'Admin'
  }))
}

export async function getJobById(id: string): Promise<Job | null> {
  const supabase = createClient()
  const role = await requireAdminOrSuper()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // Get job details
  const { data: jobData, error: jobError } = await supabase
    .from('job_forms')
    .select('*')
    .eq('id', id)
    .single()

  if (jobError || !jobData) {
    console.error('Error fetching job:', jobError)
    return null
  }

  if (role === 'admin' && jobData.created_by !== user.id) {
    throw new Error('Access denied')
  }

  // Get applicants count
  const { count, error: countError } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', id)

  if (countError) {
    console.error('Error fetching applicants count:', countError)
  }

  // Map to Job interface
  return {
    id: jobData.id,
    title: jobData.title,
    department: jobData.department,
    location: jobData.location,
    type: jobData.type,
    status: jobData.status,
    salary: {
      min: jobData.salary_min,
      max: jobData.salary_max,
      currency: jobData.salary_currency
    },
    description: jobData.description,
    requirements: jobData.requirements || [],
    benefits: jobData.benefits || [],
    postedDate: jobData.created_at,
    deadline: jobData.deadline,
    applicantsCount: count || 0,
    hiringManager: jobData.hiring_manager_name
  }
}

export async function createJob(formData: any) {
  const supabase = createClient()
  await requireAdminOrSuper()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Fetch organization of current user to auto-link job
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (userError || !userRow?.organization_id) {
    throw new Error('Missing organization for current user')
  }

  const { data, error } = await supabase
    .from('job_forms')
    .insert({
      title: formData.title,
      description: formData.description,
      department: formData.department,
      location: formData.location,
      type: formData.type,
      status: formData.status || 'draft',
      salary_min: formData.salary_min,
      salary_max: formData.salary_max,
      salary_currency: formData.salary_currency,
      requirements: formData.requirements,
      benefits: formData.benefits,
      deadline: formData.deadline,
      hiring_manager_name: formData.hiring_manager_name,
      created_by: user.id,
      evaluation_criteria: formData.evaluation_criteria || {},
      organization_id: userRow.organization_id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    // Return the error instead of throwing to let frontend handle it gracefully
    return { error: error.message || 'Failed to create job', details: error }
  }

  revalidatePath('/admin/jobs')
  return { data }
}

export async function updateJob(id: string, formData: any) {
  const supabase = createClient()
  await requireJobOwnerOrSuper(id)

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
  await requireJobOwnerOrSuper(id)

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
