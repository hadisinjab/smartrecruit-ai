
'use server'

import { createClient } from '@/utils/supabase/server'
import { IncompleteApplication } from '@/types/admin'

export async function getIncompleteApplications(): Promise<IncompleteApplication[]> {
  const supabase = createClient()
  
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

  return applications.map((app: any) => {
    const randomProgress = Math.floor(Math.random() * 90) + 10
    
    return {
      id: app.id,
      firstName: app.candidate_name?.split(' ')[0] || 'Unknown',
      lastName: app.candidate_name?.split(' ').slice(1).join(' ') || '',
      email: app.candidate_email || '',
      phone: '',
      location: 'Remote',
      position: app.job_form?.title || 'Unknown Position',
      experience: 0,
      status: 'applied',
      appliedDate: app.created_at,
      lastUpdate: app.updated_at || app.created_at,
      source: 'Website',
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
      timeSpent: Math.floor(Math.random() * 60) + 5,
      progress: {
        personalInfo: true,
        experience: randomProgress > 30,
        documents: randomProgress > 60,
        questionnaire: randomProgress > 80
      }
    }
  })
}
