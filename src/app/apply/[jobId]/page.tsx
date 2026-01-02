import { getJobForApplication } from '@/actions/applications'
import ApplyFormClient from './ApplyFormClient'
import ErrorPage from './ErrorPage'

interface PageProps {
  params: {
    jobId: string
  }
}

// Public apply route WITHOUT locale prefix: /apply/[jobId]
export default async function ApplyPage({ params }: PageProps) {
  const { jobId } = params

  const { job, questions, error } = await getJobForApplication(jobId)

  if (error || !job) {
    return <ErrorPage error={error || 'Job not found'} />
  }

  const textQuestions = questions.filter(q => q.type === 'text' || q.type === 'textarea')
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



