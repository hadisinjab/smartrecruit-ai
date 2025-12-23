
'use server'

import { createClient } from '@/utils/supabase/server'
import { Evaluation } from '@/types/admin'
import { requireReviewerOrAdmin } from '@/utils/authz'

export async function getEvaluations(): Promise<Evaluation[]> {
  const supabase = createClient()
  const role = await requireReviewerOrAdmin()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')
  
  const { data: evaluations, error } = await supabase
    .from('hr_evaluations')
    .select(`
      *,
      application:applications(
        id,
        candidate_name,
        candidate_email,
        job_form:job_forms(title, created_by)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching evaluations:', error)
    return []
  }

  if (!evaluations) return []

  // Transform data to match frontend Evaluation interface
  return evaluations
    .filter((evalData: any) => {
      if (role === 'super-admin' || role === 'reviewer') return true
      // Admins only see evaluations for their job forms
      return evalData.application?.job_form?.created_by === user.id
    })
    .map((evalData: any) => {
    // Determine type based on notes or random if not specified (placeholder logic)
    // In a real schema, we might want to add 'type' to hr_evaluations
    const type = 'technical'; // Placeholder default
    
    // Determine recommendation based on decision
    // Normalize to lowercase to handle mixed casing from seed data vs UI
    const decision = (evalData.hr_decision || '').toLowerCase();
    
    const recommendationMap: Record<string, string> = {
      'offer': 'hire',
      'strong offer': 'strong-hire',
      'reject': 'no-hire',
      'review': 'no-hire', // Default fallback
      'interview': 'hire'  // Context dependent
    };
    
    return {
      id: evalData.id,
      candidateId: evalData.application_id,
      candidateName: evalData.application?.candidate_name || 'Unknown',
      candidatePosition: evalData.application?.job_form?.title || 'Unknown Position',
      evaluatorId: 'current-user', // Placeholder as we don't track evaluator ID yet
      evaluatorName: 'HR Manager', // Placeholder
      type: type,
      date: evalData.created_at,
      createdAt: evalData.created_at,
      scores: {
        technical: evalData.hr_score || 0,
        communication: evalData.hr_score || 0, // Placeholder
        problemSolving: evalData.hr_score || 0, // Placeholder
        experience: evalData.hr_score || 0, // Placeholder
        overall: evalData.hr_score || 0
      },
      recommendation: recommendationMap[decision] || 'no-hire',
      notes: evalData.hr_notes || '',
      status: 'completed'
    };
  });
}
