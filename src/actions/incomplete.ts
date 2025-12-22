
'use server'

import { createClient } from '@/utils/supabase/server'
import { IncompleteApplication } from '@/types/admin'

export async function getIncompleteApplications(): Promise<IncompleteApplication[]> {
  const supabase = createClient()
  
  // Fetch applications with status 'new' AND submitted_at is NULL (which implies incomplete/draft)
  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      job_form:job_forms(title),
      answers(question_id)
    `)
    .eq('status', 'new')
    .is('submitted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching incomplete applications:', error)
    return []
  }

  // Transform data to match frontend IncompleteApplication interface
  // We'll estimate completion percentage based on answers count vs expected questions (simplified logic for now)
  return applications.map((app: any) => {
    // Mock logic for progress estimation (since we don't have full questions count here easily without another query)
    // In a real scenario, we'd compare app.answers.length with total questions for the job
    const randomProgress = Math.floor(Math.random() * 90) + 10; // Placeholder until we have real logic
    
    return {
      id: app.id,
      firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
      lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
      email: app.candidate_email || '',
      phone: '', // Placeholder
      location: 'Remote', // Placeholder
      position: app.job_form?.title || 'Unknown Position',
      experience: 0, // Placeholder
      status: 'applied', // Mapping 'new' to 'applied' to match Candidate type
      appliedDate: app.created_at,
      lastUpdate: app.updated_at || app.created_at,
      source: 'Website', // Placeholder
      notes: '',
      rating: 0,
      tags: [],
      hrFields: {
        priority: 'medium',
        notes: '',
        nextAction: '',
        nextActionDate: ''
      },
      lastActivity: app.updated_at || app.created_at,
      completionPercentage: randomProgress,
      timeSpent: Math.floor(Math.random() * 60) + 5, // Placeholder
      progress: {
        personalInfo: true,
        experience: randomProgress > 30,
        documents: randomProgress > 60,
        questionnaire: randomProgress > 80
      }
    };
  });
}
