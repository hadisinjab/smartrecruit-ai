'use server'

import { createClient } from '@/utils/supabase/server'
import { DashboardStats, Candidate } from '@/types/admin'

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient()

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Run queries in parallel
  const [
    { count: totalJobs },
    { count: activeJobs },
    { count: totalCandidates },
    { count: newApplications },
    { count: interviewsScheduled },
    { count: offersMade },
    { count: hires },
    { count: rejectedCandidates }
  ] = await Promise.all([
    supabase.from('job_forms').select('*', { count: 'exact', head: true }),
    supabase.from('job_forms').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()), // New this month
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'interview'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'offer'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'hired'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
  ])

  const total = totalCandidates || 0
  const rejected = rejectedCandidates || 0
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0

  return {
    totalJobs: totalJobs || 0,
    activeJobs: activeJobs || 0,
    totalCandidates: total || 0,
    newApplications: newApplications || 0,
    interviewsScheduled: interviewsScheduled || 0,
    offersMade: offersMade || 0,
    hires: hires || 0,
    rejectionRate,
    averageTimeToHire: 0 // Not implemented yet
  }
}

export async function getRecentCandidates(limit = 5): Promise<Candidate[]> {
  const supabase = createClient()
  
  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms(title),
      resumes(*),
      external_profiles(*),
      hr_evaluations(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent candidates:', error)
    return []
  }

  return applications.map(app => {
    const latestHrEval = app.hr_evaluations?.[0] || {};
    
    return {
      id: app.id,
      firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
      lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
      email: app.candidate_email || '',
      position: app.job_form?.title || 'Unknown Position',
      department: 'Engineering',
      location: 'Remote',
      status: (app.status || 'applied') as any,
      appliedDate: app.created_at,
      lastUpdate: app.updated_at || app.created_at,
      source: 'Website',
      notes: '',
      experience: 0,
      rating: latestHrEval.hr_score || 0,
      resumeUrl: app.resumes?.[0]?.file_url || '',
      linkedinUrl: app.external_profiles?.find((p: any) => p.type === 'linkedin')?.url || '',
      portfolioUrl: app.external_profiles?.find((p: any) => p.type === 'portfolio')?.url || '',
      tags: [],
      phone: '',
      hrFields: {
        priority: 'medium',
        notes: latestHrEval.hr_notes || '',
        nextAction: '',
        nextActionDate: ''
      }
    } as Candidate;
  })
}
