import { getJobForApplication } from '@/actions/applications'
import { notFound } from 'next/navigation'
import ApplyFormClient from './ApplyFormClient'
import ErrorPage from './ErrorPage'

interface PageProps {
  params: {
    jobId: string
    locale: string
  }
}

export default async function ApplyPage({ params }: PageProps) {
  const { jobId } = params

  // Fetch job and questions from database
  const { job, questions, error } = await getJobForApplication(jobId)

  if (error || !job) {
    // Show error page instead of notFound for better debugging
    return <ErrorPage error={error || 'Job not found'} />
  }

  // Separate questions into two groups:
  // 1. Text questions (text, textarea, number, select) - will be shown in text-questions stage
  // 2. Media questions (voice, file, url) - will be shown in media-questions stage
  const textQuestions = questions.filter(q => q.type === 'text' || q.type === 'textarea' || q.type === 'number' || q.type === 'select')
  const mediaQuestions = questions.filter(q => q.type === 'voice' || q.type === 'file' || q.type === 'url')

  return (
    <ApplyFormClient 
      job={job}
      textQuestions={textQuestions}
      mediaQuestions={mediaQuestions}
      jobId={jobId}
    />
  )
}
