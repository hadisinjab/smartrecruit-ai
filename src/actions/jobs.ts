
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

import { Job } from '@/types/admin';
import { requireAdminOrSuper, requireJobOwnerOrSuper, requireStaff, getSessionInfo } from '@/utils/authz'

// Get users from the same organization as the current user or job creator
export async function getOrganizationUsers(jobCreatorId?: string) {
  const supabase = createClient()
  const session = await getSessionInfo()

  if (!session) {
    return []
  }

  let organizationId: string | null = session.organizationId

  // If jobCreatorId is provided, get the organization of the job creator
  if (jobCreatorId) {
    const { data: jobCreator } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', jobCreatorId)
      .single()

    if (jobCreator?.organization_id) {
      organizationId = jobCreator.organization_id
    }
  }

  if (!organizationId) {
    return []
  }

  // Get all users from the same organization (super-admin, admin, reviewer)
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('organization_id', organizationId)
    .in('role', ['super-admin', 'admin', 'reviewer'])
    .order('full_name', { ascending: true })

  if (error || !users) {
    console.error('Error fetching organization users:', error)
    return []
  }

  return users.map((user: any) => ({
    id: user.id,
    name: user.full_name || user.email || 'Unknown',
    email: user.email,
    role: user.role
  }))
}

export async function getJobs(): Promise<Job[]> {
  const supabase = createClient()
  const session = await requireStaff() // Use requireStaff to allow reviewers too

  if (!session) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('job_forms')
    .select('*, creator:users!created_by(full_name), organization:organizations(name)')
    .order('created_at', { ascending: false })

  // Super Admin: sees everything (no filter needed)
  
  // Admin: sees jobs belonging to their organization
  if (session.role === 'admin') {
    if (!session.organizationId) return [] // Safety check
    query = query.eq('organization_id', session.organizationId)
  }
  
  // Reviewer: sees jobs belonging to their organization
  if (session.role === 'reviewer') {
    if (!session.organizationId) return [] // Safety check
    query = query.eq('organization_id', session.organizationId)
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
    .select('job_form_id')

  const counts: Record<string, number> = {};
  if (appCounts) {
    appCounts.forEach((app: any) => {
      counts[app.job_form_id] = (counts[app.job_form_id] || 0) + 1;
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
    hiringManager: job.hiring_manager_name || 'Admin',
    creatorName: job.creator?.full_name || 'Unknown',
    organizationName: job.organization?.name || 'Unknown'
  }))
}

export async function getJob(id: string) {
  return getJobById(id);
}

export async function getJobById(id: string): Promise<Job | null> {
  const supabase = createClient()
  const session = await requireStaff() // Use requireStaff to support Reviewers too
  
  if (!session) {
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

  // Check access permissions
  // Admin and Reviewer can only access jobs from their own organization
  if (session.role === 'admin' || session.role === 'reviewer') {
    if (jobData.organization_id !== session.organizationId) {
       throw new Error('Access denied')
    }
  }

  // Get applicants count
  const { count, error: countError } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('job_form_id', id)

  if (countError) {
    console.error('Error fetching applicants count:', countError)
  }

  // Fetch questions for this job
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('job_form_id', id)
    .order('order_index', { ascending: true });

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
  }

  // Get hiring manager name if hiring_manager_name is a user ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let hiringManagerName = jobData.hiring_manager_name || '';
  let hiringManagerId: string | undefined = undefined;
  
  if (jobData.hiring_manager_name) {
    // Check if it's a UUID (user ID)
    if (uuidRegex.test(jobData.hiring_manager_name)) {
      // It's a user ID, get the user's name
      hiringManagerId = jobData.hiring_manager_name;
      const { data: hiringManager } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', jobData.hiring_manager_name)
        .single();
      
      if (hiringManager) {
        hiringManagerName = hiringManager.full_name || hiringManager.email || jobData.hiring_manager_name;
      }
    }
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
    hiringManager: hiringManagerName,
    hiring_manager_id: hiringManagerId, // Keep ID for editing
    created_by: jobData.created_by, // Add created_by for getting organization users
    evaluation_criteria: questions?.map(q => ({
      id: q.id,
      type: q.type,
      label: q.label,
      required: q.required,
      pageNumber: q.page_number,
      options: q.config?.options || []
    })) || []
  } as Job & { created_by?: string; hiring_manager_id?: string }
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

  // Generate application link - will be set after job creation
  // For now, we'll generate it after getting the job ID
  
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

  // Insert questions if provided
  if (formData.questions && Array.isArray(formData.questions) && formData.questions.length > 0) {
    const questionsToInsert = formData.questions.map((q: any, index: number) => ({
      job_form_id: data.id,
      page_number: q.pageNumber || 1, // Use provided page number or default to 1
      type: q.type,
      label: q.label,
      required: q.required || false,
      config: q.options ? { options: q.options } : {}, // Store additional config like options in JSON
      order_index: index + 1 // 1-based index
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
       console.error('Error creating questions:', questionsError);
       // We don't throw here to avoid failing the whole job creation, but we log it
    }
  }

  // Update evaluation_criteria to match questions for backward compatibility
  // This ensures consistency between questions table and evaluation_criteria
  if (formData.questions && Array.isArray(formData.questions) && formData.questions.length > 0) {
    const evaluationCriteria = formData.questions.map((q: any) => ({
      id: q.id || `temp-${Date.now()}-${Math.random()}`,
      type: q.type,
      label: q.label,
      required: q.required || false,
      pageNumber: q.pageNumber || 1,
      options: q.options || []
    }));

    await supabase
      .from('job_forms')
      .update({ evaluation_criteria: evaluationCriteria })
      .eq('id', data.id);
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

  // Update questions if provided
  if (formData.questions && Array.isArray(formData.questions)) {
    // Delete existing questions
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('job_form_id', id)

    if (deleteError) {
      console.error('Error deleting old questions:', deleteError)
      // Continue anyway, but log the error
    }

    // Insert new questions if there are any
    if (formData.questions.length > 0) {
      const questionsToInsert = formData.questions.map((q: any, index: number) => ({
        job_form_id: id,
        page_number: q.pageNumber || 1,
        type: q.type,
        label: q.label,
        required: q.required || false,
        config: q.options ? { options: q.options } : {},
        order_index: index + 1
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (questionsError) {
        console.error('Error updating questions:', questionsError)
        // Don't throw here to avoid failing the whole update, but log it
      }
    }
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
