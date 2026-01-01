
'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'

import { Job } from '@/types/admin';
import { requireAdminOrSuper, requireJobOwnerOrSuper, requireStaff, getSessionInfo } from '@/utils/authz'
import { logAdminEvent } from '@/actions/activity'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isTransientSupabaseFetchError(err: any): boolean {
  const msg = String(err?.message || '')
  const details = String(err?.details || '')
  // When node fetch fails (e.g. ECONNRESET), supabase-js often surfaces it like this.
  return (
    msg.includes('fetch failed') ||
    details.includes('ECONNRESET') ||
    details.includes('ETIMEDOUT') ||
    details.includes('ENOTFOUND') ||
    details.includes('EAI_AGAIN')
  )
}

async function withRetries<T>(fn: () => Promise<{ data: T | null; error: any }>, attempts = 3) {
  let last: any = null
  for (let i = 0; i < attempts; i++) {
    const res = await fn()
    if (!res.error) return res
    last = res.error
    if (!isTransientSupabaseFetchError(res.error) || i === attempts - 1) {
      return res
    }
    await sleep(250 * (i + 1))
  }
  return { data: null, error: last }
}

// Get users from the same organization as the current user or job creator
export async function getOrganizationUsers(jobCreatorId?: string) {
  // Ensure this is never cached across users/tenants.
  // If Next caches server action responses in any way, this prevents cross-org leakage.
  noStore()

  const supabase = createClient()
  const session = await requireStaff()

  if (!session) {
    return []
  }

  let organizationId: string | null = session.organizationId

  // If jobCreatorId is provided, get the organization of the job creator
  if (jobCreatorId) {
    // Super Admin is allowed to resolve org from the job creator (cross-org access).
    // For Admin/Reviewer, we only accept a jobCreatorId that matches their own org.
    if (session.role === 'super-admin') {
      const admin = createAdminClient()
      const { data: jobCreator } = await admin
        .from('users')
        .select('organization_id')
        .eq('id', jobCreatorId)
        .single()

      if (jobCreator?.organization_id) {
        organizationId = jobCreator.organization_id
      }
    } else {
      // Resolve via RLS-scoped client and ensure it matches the caller's org.
      const { data: jobCreator } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', jobCreatorId)
        .single()

      if (jobCreator?.organization_id && jobCreator.organization_id === session.organizationId) {
        organizationId = jobCreator.organization_id
      }
    }
  }

  if (!organizationId) {
    return []
  }

  // IMPORTANT: Always query the staff list via the admin client (service role),
  // but only after we have securely resolved/validated organizationId above.
  // This prevents any accidental cross-tenant leakage from RLS/caching quirks.
  const admin = createAdminClient()

  // Get all users from the same organization (super-admin, admin, reviewer)
  const { data: users, error } = await admin
    .from('users')
    .select('id, full_name, email, role')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
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
    .select('*, organization:organizations(name)')
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

  // Resolve creator names (avoid relying on embedded join relationship naming).
  const creatorIds = Array.from(
    new Set((data || []).map((job: any) => job.created_by).filter(Boolean))
  ) as string[]

  const creatorNameById = new Map<string, string>()
  if (creatorIds.length) {
    // Use admin client so we can still resolve creator names even if the creator is a super-admin
    // (who may not belong to the viewer's organization). This is safe because `creatorIds` are
    // derived from the already org-scoped `job_forms` result above.
    const admin = createAdminClient()
    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, full_name, email')
      .in('id', creatorIds)
    if (usersErr) {
      console.error('Error fetching job creators:', usersErr)
    } else {
      ;(users || []).forEach((u: any) => {
        const name = u.full_name || u.email
        if (u.id && name) creatorNameById.set(u.id, name)
      })
    }
  }

  // Resolve hiring manager names (jobs may store hiring_manager_name as a user UUID).
  // Use the admin client so Reviewers (who may not have RLS access to other users) still see names.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const hiringManagerIds = Array.from(
    new Set(
      (data || [])
        .map((job: any) => job.hiring_manager_name)
        .filter((v: any) => typeof v === 'string' && uuidRegex.test(v))
    )
  ) as string[]

  const hiringManagerById = new Map<string, { name: string; organizationId?: string | null }>()
  if (hiringManagerIds.length) {
    const admin = createAdminClient()
    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, full_name, email, organization_id')
      .in('id', hiringManagerIds)

    if (usersErr) {
      console.error('Error fetching hiring managers:', usersErr)
    } else {
      ;(users || []).forEach((u: any) => {
        const name = u.full_name || u.email
        if (u.id && name) hiringManagerById.set(u.id, { name, organizationId: u.organization_id })
      })
    }
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
    hiringManager: (() => {
      const raw = job.hiring_manager_name
      if (!raw) return 'Admin'
      if (typeof raw === 'string' && uuidRegex.test(raw)) {
        const resolved = hiringManagerById.get(raw)
        // Extra safety: only show the resolved name if it matches the job's org.
        if (resolved && (!resolved.organizationId || resolved.organizationId === job.organization_id)) {
          return resolved.name
        }
        return 'Unknown'
      }
      return raw
    })(),
    creatorName:
      creatorNameById.get(job.created_by) ||
      (job.created_by ? `User ${String(job.created_by).slice(0, 8)}` : 'Unknown'),
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let hiringManagerName = jobData.hiring_manager_name || ''
  let hiringManagerId: string | undefined = undefined
  
  if (jobData.hiring_manager_name) {
    // Check if it's a UUID (user ID)
    if (uuidRegex.test(jobData.hiring_manager_name)) {
      // It's a user ID, get the user's name
      hiringManagerId = jobData.hiring_manager_name

      // Use admin client to bypass RLS safely; the job is already org-scoped above.
      const admin = createAdminClient()
      const { data: hiringManager, error: hmErr } = await admin
        .from('users')
        .select('full_name, email, organization_id')
        .eq('id', jobData.hiring_manager_name)
        .single()
      
      if (hmErr) {
        console.error('Error fetching hiring manager:', hmErr)
      }

      // Extra safety: only reveal name if the hiring manager belongs to the same organization as the job.
      if (hiringManager && (!hiringManager.organization_id || hiringManager.organization_id === jobData.organization_id)) {
        hiringManagerName = hiringManager.full_name || hiringManager.email || 'Unknown'
      } else if (!hiringManager) {
        hiringManagerName = 'Unknown'
      }
    }
  }

  // Map to Job interface
  return {
    // Keep raw DB columns for compatibility with existing UI (edit page reads snake_case fields).
    ...(jobData as any),
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

  // If hiring_manager_name looks like a user UUID, enforce it belongs to the same organization.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (formData.hiring_manager_name && uuidRegex.test(formData.hiring_manager_name)) {
    const { data: managerRow, error: managerErr } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', formData.hiring_manager_name)
      .single()

    if (managerErr || !managerRow) {
      throw new Error('Invalid hiring manager')
    }
    if (managerRow.organization_id !== userRow.organization_id) {
      throw new Error('Hiring manager must belong to the same organization')
    }
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
      assignment_enabled: !!formData.assignment_enabled,
      assignment_required: !!formData.assignment_required,
      assignment_type: formData.assignment_type || null,
      assignment_description: formData.assignment_description || null,
      assignment_weight: formData.assignment_weight ?? null,
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

  await logAdminEvent({
    action: 'job.create',
    entityType: 'job',
    entityId: data.id,
    jobFormId: data.id,
    metadata: {
      title: formData.title,
      status: formData.status || 'draft',
    },
  })

  revalidatePath('/admin/jobs')
  return { data }
}

export async function updateJob(id: string, formData: any) {
  const supabase = createClient()
  await requireJobOwnerOrSuper(id)

  // Enforce: Hiring manager (if provided as UUID) must belong to the same organization as the job.
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (formData.hiring_manager_name && uuidRegex.test(formData.hiring_manager_name)) {
    const { data: jobOrgRow, error: jobOrgErr } = await supabase
      .from('job_forms')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (jobOrgErr || !jobOrgRow?.organization_id) {
      throw new Error('Job not found')
    }

    const { data: managerRow, error: managerErr } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', formData.hiring_manager_name)
      .single()

    if (managerErr || !managerRow) {
      throw new Error('Invalid hiring manager')
    }
    if (managerRow.organization_id !== jobOrgRow.organization_id) {
      throw new Error('Hiring manager must belong to the same organization')
    }
  }

  const { data, error } = await withRetries(
    () =>
      supabase
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
          assignment_enabled: !!formData.assignment_enabled,
          assignment_required: !!formData.assignment_required,
          assignment_type: formData.assignment_type || null,
          assignment_description: formData.assignment_description || null,
          assignment_weight: formData.assignment_weight ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single(),
    3
  )

  if (error) {
    console.error('Error updating job:', error)
    // Surface a more actionable message to the UI for debugging.
    const msg = error?.message || 'Failed to update job'
    const details = error?.details ? ` (${String(error.details).slice(0, 200)})` : ''
    throw new Error(`${msg}${details}`)
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

  await logAdminEvent({
    action: 'job.update',
    entityType: 'job',
    entityId: id,
    jobFormId: id,
    metadata: {
      title: formData.title,
      status: formData.status,
    },
  })

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
  return data
}

export async function deleteJob(id: string) {
  const supabase = createClient()
  await requireJobOwnerOrSuper(id)

  // Use admin client for the actual deletion to avoid RLS issues,
  // but keep authorization via requireJobOwnerOrSuper above.
  const admin = createAdminClient()

  const { data: jobBeforeDelete } = await admin
    .from('job_forms')
    .select('title')
    .eq('id', id)
    .single()

  // IMPORTANT: applications.job_form_id is NOT cascade-deleting in our schema,
  // so delete applications first. application children are cascade-deleted.
  const { error: appsErr } = await admin
    .from('applications')
    .delete()
    .eq('job_form_id', id)

  if (appsErr) {
    console.error('Error deleting job applications:', appsErr)
    throw new Error('Failed to delete job applications')
  }

  // Questions are cascade-deleted with job_forms, but deleting explicitly is safe.
  const { error: qErr } = await admin
    .from('questions')
    .delete()
    .eq('job_form_id', id)

  if (qErr) {
    console.error('Error deleting job questions:', qErr)
    throw new Error('Failed to delete job questions')
  }

  const { error: jobErr } = await admin
    .from('job_forms')
    .delete()
    .eq('id', id)

  if (jobErr) {
    console.error('Error deleting job:', jobErr)
    throw new Error('Failed to delete job')
  }

  await logAdminEvent({
    action: 'job.delete',
    entityType: 'job',
    entityId: id,
    jobFormId: id,
    metadata: {
      title: jobBeforeDelete?.title ?? null,
    },
  })

  revalidatePath('/admin/jobs')
}

export async function closeJob(id: string) {
  const supabase = createClient()
  await requireJobOwnerOrSuper(id)

  const { data: jobBeforeClose } = await supabase
    .from('job_forms')
    .select('title,status')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('job_forms')
    .update({ status: 'closed', updated_at: new Date().toISOString() } as any)
    .eq('id', id)

  if (error) {
    console.error('Error closing job:', error)
    throw new Error('Failed to close job')
  }

  await logAdminEvent({
    action: 'job.close',
    entityType: 'job',
    entityId: id,
    jobFormId: id,
    metadata: {
      title: jobBeforeClose?.title ?? null,
      previous_status: jobBeforeClose?.status ?? null,
      status: 'closed',
    },
  })

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${id}`)
}
