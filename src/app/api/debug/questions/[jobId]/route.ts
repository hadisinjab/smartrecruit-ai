import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const supabase = createClient()
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('job_form_id', params.jobId)
  
  return NextResponse.json({ questions, error })
}
