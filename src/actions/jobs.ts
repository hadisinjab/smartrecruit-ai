
'use server'

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'

import { Job } from '@/types/admin';
import { requireAdminOrSuper, requireJobOwnerOrSuper, requireStaff, getSessionInfo } from '@/utils/authz'
import { logAdminEvent } from '@/actions/activity'
import { createNotification, getRecipientsForJob } from '@/lib/notifications'

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
        .single() as any

      if (jobCreator?.organization_id) {
        organizationId = jobCreator.organization_id
      }
    } else {
      // Resolve via RLS-scoped client and ensure it matches the caller's org.
      const { data: jobCreator } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', jobCreatorId)
        .single() as any

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

  console.log('Raw questions from DB:', questions);

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
        .single() as any
      
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
    evaluation_criteria: questions?.map(q => {
      console.log('Raw question from DB:', q);
      console.log('Question label:', q.label);
      console.log('Question label type:', typeof q.label);
      return {
        id: q.id,
        type: q.type,
        label: q.label,
        required: q.required,
        pageNumber: q.page_number,
        options: q.config?.options || []
      };
    }) || []
  } as Job & { created_by?: string; hiring_manager_id?: string }
}

export async function createJob(formData: any) {
  const supabase = createClient()
  
  // Use requireAdminOrSuper() to validate permissions
  const session = await requireAdminOrSuper()

  // Get current user details from DB (using admin client to ensure we get org ID)
  // This redundancy with authz.ts is okay for safety
  const admin = createAdminClient()
  const { data: userRow, error: userError } = await admin
    .from('users')
    .select('organization_id')
    .eq('id', session.id)
    .single() as any

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
      .single() as any

    if (managerErr || !managerRow) {
      throw new Error('Invalid hiring manager')
    }
    if (managerRow.organization_id !== userRow.organization_id) {
      throw new Error('Hiring manager must belong to the same organization')
    }
  }

  // Generate application link - will be set after job creation
  // For now, we'll generate it after getting the job ID
  
  console.log('--- createJob Payload Debug ---');
  console.log('assignment_enabled:', formData.assignment_enabled);
  console.log('assignment_type (raw):', formData.assignment_type);
  console.log('assignment_timing:', formData.assignment_timing);

  const payload = {
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
    created_by: session.id,
    evaluation_criteria: formData.evaluation_criteria || {},
    assignment_enabled: !!formData.assignment_enabled,
    assignment_required: !!formData.assignment_required,
    assignment_type: formData.assignment_type || null,
    assignment_description: formData.assignment_description || null,
    assignment_weight: formData.assignment_weight ?? null,
    assignment_timing: formData.assignment_timing || 'before',
    organization_id: userRow.organization_id
  };

  console.log('assignment_type (final payload):', payload.assignment_type);
  console.log('-------------------------------');

  const { data, error } = await supabase
    .from('job_forms')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    // Return the error instead of throwing to let frontend handle it gracefully
    return { error: error.message || 'Failed to create job', details: error }
  }

  // Insert questions (User defined)
  const userQuestionsList = (formData.questions && Array.isArray(formData.questions)) ? formData.questions : [];
  
  // 1. Map User Questions
  const mappedUserQuestions = userQuestionsList
    .map((q: any, index: number) => ({
      job_form_id: data.id,
      page_number: q.pageNumber || 1,
      type: q.type,
      label: q.label,
      required: q.required || false,
      config: q.options ? { options: q.options } : {},
      order_index: index + 1
    }));

  // 2. Insert into Database
  if (mappedUserQuestions.length > 0) {
    const { error: questionsError } = await supabase
      .from('questions')
      .insert(mappedUserQuestions);

    if (questionsError) {
       console.error('Error creating questions:', questionsError);
    }
  }

  // Update evaluation_criteria to match questions for backward compatibility
  if (mappedUserQuestions.length > 0) {
    const evaluationCriteria = mappedUserQuestions.map((q: any) => ({
      id: q.id || `temp-${Date.now()}-${Math.random()}`,
      type: q.type,
      label: q.label,
      required: q.required || false,
      pageNumber: q.page_number || 1,
      options: q.config?.options || []
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

  // Notification: job created (after save only)
  try {
    const { recipients, job } = await getRecipientsForJob(data.id)
    const actionUrl = `/admin/jobs/${data.id}`
    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          user_id: userId,
          type: 'job_created',
          title: 'Job created',
          content: `A job was created: ${job?.title || formData.title || 'New job'}.`,
          metadata: {
            job_id: data.id,
            job_title: job?.title || formData.title || null,
            action_url: actionUrl,
          } as any,
        })
      )
    )
  } catch (e) {
    console.error('[notifications] createJob:', e)
  }

  revalidatePath('/admin/jobs')
  revalidatePath(`/apply/${data.id}`) // Ensure apply page is revalidated
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
          assignment_timing: formData.assignment_timing || 'before',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
        .select()
        .single() as any,
    3
  )

  if (error) {
    console.error('Error updating job:', error)
    // Surface a more actionable message to the UI for debugging.
    const msg = error?.message || 'Failed to update job'
    const details = error?.details ? ` (${String(error.details).slice(0, 200)})` : ''
    throw new Error(`${msg}${details}`)
  }

  // Update questions if provided or if we need to update fixed questions
  if ((formData.questions && Array.isArray(formData.questions)) || formData.benefits) {
    // --- Smart Question Synchronization ---
    const admin = createAdminClient() // Use admin for elevated privileges

    // 1. Get existing questions from DB
    const { data: existingQuestions, error: fetchError } = await admin
      .from('questions')
      .select('id, label')
      .eq('job_form_id', id)

    if (fetchError) {
      console.error('Error fetching existing questions:', fetchError)
      throw new Error('Could not retrieve existing questions to update.')
    }

    const newQuestions = (formData.questions || []).filter((q: any) => q.label)
    const existingQuestionMap = new Map((existingQuestions || []).map((q: any) => [q.id, q]))
    const newQuestionMap = new Map(newQuestions.filter((q: any) => q.id).map((q: any) => [q.id, q]))

    // 2. Identify questions to delete
    const questionsToDelete = (existingQuestions || []).filter((q: any) => !newQuestionMap.has(q.id))

    if (questionsToDelete.length > 0) {
      const deletableQuestionIds: string[] = []
      const undeletableQuestionLabels: string[] = []

      // Check each question for existing answers before deleting
      for (const q of questionsToDelete) {
        const { count, error: answerCountError } = await admin
          .from('answers')
          .select('*', { count: 'exact', head: true })
          .eq('question_id', q.id)

        if (answerCountError) {
          console.error(`Error checking answers for question ${q.id}:`, answerCountError)
          continue // Skip deletion on error to be safe
        }

        if (count === 0) {
          deletableQuestionIds.push(q.id)
        } else {
          undeletableQuestionLabels.push(q.label)
        }
      }

      // If some questions have answers and cannot be deleted, throw an error
      if (undeletableQuestionLabels.length > 0) {
        throw new Error(
          `Cannot delete questions with existing answers: "${undeletableQuestionLabels.join('", "')}"`
        )
      }

      // Proceed with deletion if all are clear
      if (deletableQuestionIds.length > 0) {
        const { error: deleteError } = await admin
          .from('questions')
          .delete()
          .in('id', deletableQuestionIds)

        if (deleteError) {
          console.error('Failed to delete questions:', deleteError)
          throw new Error('An error occurred while removing old questions.')
        }
      }
    }

    // 3. Identify questions to update and insert
    const questionsToUpdate = newQuestions
      .filter((q: any) => q.id && newQuestionMap.has(q.id))
      .map((q: any, index: number) => ({
        id: q.id,
        job_form_id: id,
        page_number: q.pageNumber || 1,
        type: q.type,
        label: q.label,
        required: q.required || false,
        config: q.options ? { options: q.options } : {},
        order_index: newQuestions.findIndex((nq: any) => nq.id === q.id) + 1
      }))

    const questionsToInsert = newQuestions
      .filter((q: any) => !q.id)
      .map((q: any, index: number) => ({
        job_form_id: id,
        page_number: q.pageNumber || 1,
        type: q.type,
        label: q.label,
        required: q.required || false,
        config: q.options ? { options: q.options } : {},
        order_index: newQuestions.findIndex((nq: any) => nq.label === q.label && !nq.id) + 1
      }))

    // 4. Perform DB operations
    if (questionsToUpdate.length > 0) {
      const { error: updateError } = await admin.from('questions').upsert(questionsToUpdate)
      if (updateError) {
        console.error('Failed to update questions:', updateError)
        throw new Error('Failed to update questions')
      }
    }

    if (questionsToInsert.length > 0) {
      const { error: insertError } = await admin.from('questions').insert(questionsToInsert)
      if (insertError) {
        console.error('Failed to insert new questions:', insertError)
        throw new Error('Failed to add new questions')
      }
    }

    // 5. Sync evaluation_criteria to match questions
    if (newQuestions.length > 0) {
      const evaluationCriteria = newQuestions.map((q: any) => ({
        id: q.id || `temp-${Date.now()}-${Math.random()}`,
        type: q.type,
        label: q.label,
        required: q.required || false,
        pageNumber: q.pageNumber || 1,
        options: q.options || []
      }));

      await admin
        .from('job_forms')
        .update({ evaluation_criteria: evaluationCriteria })
        .eq('id', id);
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

  // Notification: job updated (after save only)
  try {
    const { recipients, job } = await getRecipientsForJob(id)
    const actionUrl = `/admin/jobs/${id}`
    await Promise.all(
      recipients.map((userId) =>
        createNotification({
          user_id: userId,
          type: 'job_updated',
          title: 'Job updated',
          content: `A job was updated: ${job?.title || formData.title || 'Job'}.`,
          metadata: {
            job_id: id,
            job_title: job?.title || formData.title || null,
            action_url: actionUrl,
          } as any,
        })
      )
    )
  } catch (e) {
    console.error('[notifications] updateJob:', e)
  }

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
    .single() as any

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
