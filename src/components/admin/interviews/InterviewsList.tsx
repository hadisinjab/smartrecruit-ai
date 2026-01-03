'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/admin-card'
import { AddInterviewModal } from './AddInterviewModal'
import { InterviewCard } from './InterviewCard'
import { getInterviewsByApplication } from '@/actions/interviews'
import { useToast } from '@/context/ToastContext'
import type { Interview } from '@/types/interview'

interface InterviewsListProps {
  applicationId: string
}

export function InterviewsList({ applicationId }: InterviewsListProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await getInterviewsByApplication(applicationId)
      if (res.ok) {
        setInterviews(res.data || [])
      } else {
        setInterviews([])
        addToast('error', res.error || 'Failed to load interviews')
      }
    } catch (e) {
      console.error(e)
      setInterviews([])
      addToast('error', 'Failed to load interviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId])

  if (loading) {
    return (
      <Card className='p-6'>
        <div className='text-center text-gray-500'>Loading interviews...</div>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <h3 className='text-lg font-semibold text-gray-900'>Interviews</h3>
        <AddInterviewModal applicationId={applicationId} onSuccess={load} />
      </div>

      {interviews.length === 0 ? (
        <Card className='p-8 text-center border-dashed'>
          <h4 className='font-medium mb-2 text-gray-900'>No interviews recorded yet</h4>
          <p className='text-sm text-gray-600 mb-4'>
            Add a recording link to start building an interview history for this candidate.
          </p>
          <AddInterviewModal applicationId={applicationId} onSuccess={load} />
        </Card>
      ) : (
        <div className='space-y-3'>
          {interviews.map((interview, index) => (
            <InterviewCard key={interview.id} interview={interview} index={index} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  )
}







