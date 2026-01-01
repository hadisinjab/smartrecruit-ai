'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createInterview } from '@/actions/interviews'
import { useToast } from '@/context/ToastContext'

interface AddInterviewModalProps {
  applicationId: string
  onSuccess: () => void
}

export function AddInterviewModal({ applicationId, onSuccess }: AddInterviewModalProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Please enter a recording URL')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createInterview({
        application_id: applicationId,
        audio_or_video_url: url.trim(),
        notes: notes.trim() || undefined,
      })

      if (res.ok) {
        addToast('success', 'Interview added')
        setUrl('')
        setNotes('')
        setOpen(false)
        onSuccess()
      } else {
        setError(res.error || 'Failed to add interview')
        addToast('error', res.error || 'Failed to add interview')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to add interview')
      addToast('error', 'Failed to add interview')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Add Interview</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>Add Interview Recording</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <Label htmlFor='url'>
              Recording Link <span className='text-red-600'>*</span>
            </Label>
            <Input
              id='url'
              type='url'
              placeholder='https://youtube.com/watch?v=...'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={error ? 'border-red-500' : ''}
            />
            {error ? <p className='text-sm text-red-600 mt-1'>{error}</p> : null}
            <div className='mt-2 text-xs text-gray-500'>
              Supported: YouTube (unlisted/public), Google Drive, Dropbox/OneDrive, direct links (.mp3/.mp4/.wav)
            </div>
          </div>

          <div>
            <Label htmlFor='notes'>Notes (optional)</Label>
            <Textarea
              id='notes'
              placeholder='e.g., Technical interview focused on APIs and database design'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <p className='text-xs text-gray-500 mt-1'>{notes.length} / 1000</p>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button type='button' variant='outline' onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}





