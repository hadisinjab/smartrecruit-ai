'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCandidates() {
  const supabase = createClient()
  
  // Fetch applications with job details
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

  if (error) {
    console.error('Error fetching candidates:', error)
    throw new Error('Failed to fetch candidates')
  }

  // Transform data to match frontend Candidate interface
  const candidates = applications.map(app => {
    // Get latest HR evaluation if exists
    const latestHrEval = app.hr_evaluations?.[0] || {};
    
    return {
      id: app.id,
      firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
      lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
      email: app.candidate_email || '',
      position: app.job_form?.title || 'Unknown Position',
      department: 'Engineering', // Placeholder as it's not directly in application
      location: 'Remote', // Placeholder
      status: app.status || 'applied',
      appliedDate: app.created_at,
      experience: 0, // Placeholder
      rating: latestHrEval.hr_score || 0,
      resumeUrl: app.resumes?.[0]?.file_url || '',
      linkedinUrl: app.external_profiles?.find((p: any) => p.type === 'linkedin')?.url || '',
      portfolioUrl: app.external_profiles?.find((p: any) => p.type === 'portfolio')?.url || '',
      tags: [], // Placeholder
      phone: '', // Placeholder
      hrFields: {
        priority: 'medium', // Default
        notes: latestHrEval.hr_notes || '',
        nextAction: latestHrEval.hr_decision || 'Review',
        nextActionDate: new Date().toISOString() // Placeholder
      }
    };
  });

  return candidates;
}

export async function getCandidateById(id: string) {
  const supabase = createClient()
  
  const { data: app, error } = await supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms(title),
      resumes(*),
      external_profiles(*),
      hr_evaluations(*),
      answers(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching candidate:', error)
    return null
  }

  // Get latest HR evaluation if exists
  const latestHrEval = app.hr_evaluations?.[0] || {};

  return {
    id: app.id,
    firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
    lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
    email: app.candidate_email || '',
    position: app.job_form?.title || 'Unknown Position',
    department: 'Engineering', // Placeholder
    location: 'Remote', // Placeholder
    status: app.status || 'applied',
    appliedDate: app.created_at,
    experience: 0, // Placeholder
    rating: latestHrEval.hr_score || 0,
    resumeUrl: app.resumes?.[0]?.file_url || '',
    linkedinUrl: app.external_profiles?.find((p: any) => p.type === 'linkedin')?.url || '',
    portfolioUrl: app.external_profiles?.find((p: any) => p.type === 'portfolio')?.url || '',
    tags: [], // Placeholder
    phone: '', // Placeholder
    hrFields: {
      priority: 'medium',
      notes: latestHrEval.hr_notes || '',
      nextAction: latestHrEval.hr_decision || 'Review',
      nextActionDate: new Date().toISOString()
    }
  };
}
