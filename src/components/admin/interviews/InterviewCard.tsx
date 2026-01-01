'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/admin-card'
import { Trash2, ExternalLink } from 'lucide-react'
import { deleteInterview } from '@/actions/interviews'
import { useToast } from '@/context/ToastContext'
import { InterviewAnalysisDialog } from './InterviewAnalysisDialog'
import type { Interview } from '@/types/interview'

interface InterviewCardProps {
  interview: Interview
  index: number
  onDeleted: () => void
}

export function InterviewCard({ interview, index, onDeleted }: InterviewCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { addToast } = useToast()

  const handleDelete = async () => {
    const ok = window.confirm('Delete this interview?')
    if (!ok) return

    setIsDeleting(true)
    try {
      const res = await deleteInterview(interview.id)
      if (res.ok) {
        addToast('success', 'Interview deleted')
        onDeleted()
      } else {
        addToast('error', res.error || 'Failed to delete interview')
      }
    } catch (e) {
      console.error(e)
      addToast('error', 'Failed to delete interview')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className='p-4'>
      <div className='flex items-start justify-between gap-3 mb-3'>
        <div>
          <h4 className='font-medium text-gray-900'>Interview #{index + 1}</h4>
          <div className='text-xs text-gray-500 mt-1'>
            Uploaded: {interview.created_at ? new Date(interview.created_at).toLocaleString() : '—'}
          </div>
        </div>

        <Button
          variant='ghost'
          size='sm'
          onClick={handleDelete}
          disabled={isDeleting}
          className='text-red-600 hover:text-red-700 hover:bg-red-50'
        >
          <Trash2 className='w-4 h-4 mr-2' />
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <div className='space-y-4'>
        <div>
          <div className='text-sm text-gray-600 mb-1'>Recording</div>
          <a
            href={interview.audio_or_video_url}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 text-sm text-blue-600 hover:underline break-all'
          >
            <span>Open recording</span>
            <ExternalLink className='w-4 h-4' />
          </a>
        </div>

        <div>
          <div className='text-sm text-gray-600 mb-1'>AI Analysis</div>
          {interview.audio_analysis ? (
            <InterviewAnalysisDialog analysis={interview.audio_analysis} />
          ) : (
            <div className='text-sm text-gray-500 italic'>Not available yet</div>
          )}
        </div>
      </div>
    </Card>
  )
}





