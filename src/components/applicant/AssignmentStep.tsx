'use client'

import React, { useMemo, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Loader2, X, Video } from 'lucide-react'

export type AssignmentType = 'text_only' | 'text_and_links' | 'video_upload'

export interface AssignmentConfig {
  enabled: boolean
  required: boolean
  type: AssignmentType
  description: string
}

export interface AssignmentData {
  text_fields: string
  link_fields: string[]
}

interface AssignmentStepProps {
  assignmentConfig: AssignmentConfig
  initialData?: Partial<AssignmentData>
  onNext: (data: AssignmentData) => void
  onPrevious?: () => void
}

export function AssignmentStep({ assignmentConfig, initialData, onNext, onPrevious }: AssignmentStepProps) {
  const [textAnswer, setTextAnswer] = useState(initialData?.text_fields || '')
  const [links, setLinks] = useState<string[]>(
    initialData?.link_fields?.length ? initialData.link_fields : ['']
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(
    assignmentConfig.type === 'video_upload' && initialData?.link_fields?.[0] ? initialData.link_fields[0] : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validLinks = useMemo(() => links.map((l) => l.trim()).filter(Boolean), [links])

  const uploadVideo = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      return result.url
    } catch (error) {
      console.error('Video upload error:', error)
      setErrors(prev => ({ ...prev, video: 'Failed to upload video' }))
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, video: 'File size must be less than 100MB' }))
      return
    }

    setVideoFile(file)
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.video
      return newErrors
    })

    // Auto upload
    const url = await uploadVideo(file)
    if (url) {
      setUploadedVideoUrl(url)
    }
  }

  const validateAndSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (assignmentConfig.required && !textAnswer.trim() && assignmentConfig.type !== 'video_upload') {
      newErrors.text = 'Please provide your solution'
    }

    if (textAnswer.length > 10000) {
      newErrors.text = 'Text is too long (max 10,000 characters)'
    }

    if (assignmentConfig.type === 'text_and_links') {
      if (assignmentConfig.required && validLinks.length === 0) {
        newErrors.links = 'Please provide at least one link'
      }

      validLinks.forEach((link, index) => {
        try {
          // eslint-disable-next-line no-new
          new URL(link)
        } catch {
          newErrors[`link_${index}`] = 'Invalid URL format'
        }
      })
    }

    if (assignmentConfig.type === 'video_upload') {
      if (assignmentConfig.required && !uploadedVideoUrl) {
        newErrors.video = 'Please upload a video'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onNext({
      text_fields: textAnswer,
      link_fields: assignmentConfig.type === 'text_and_links' ? validLinks : 
                   assignmentConfig.type === 'video_upload' && uploadedVideoUrl ? [uploadedVideoUrl] : [],
    })
  }

  const addLinkField = () => {
    if (links.length < 5) setLinks((prev) => [...prev, ''])
  }

  const removeLinkField = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className='w-full max-w-2xl mx-auto space-y-6'>
      <div className='text-start'>
        <h2 className='text-xl font-semibold text-gray-900'>Assignment</h2>
        {assignmentConfig.required && <p className='text-sm text-red-600'>* Required</p>}
      </div>

      <Card className='p-4 bg-blue-50 border border-blue-200'>
        <p className='text-sm whitespace-pre-wrap text-gray-800'>{assignmentConfig.description}</p>
      </Card>

      {/* Text Answer - Optional for video upload if not required explicitly, but usually good to have context */}
      <div className='space-y-2 text-start'>
        <Label htmlFor='assignment-text'>
          Your Solution {assignmentConfig.required && assignmentConfig.type !== 'video_upload' && <span className='text-red-600'>*</span>}
        </Label>
        <Textarea
          id='assignment-text'
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          placeholder='Explain your approach, paste code, or describe your solution...'
          rows={10}
          className={errors.text ? 'border-red-500' : ''}
        />
        {errors.text && <p className='text-sm text-red-600'>{errors.text}</p>}
        <p className='text-sm text-gray-500'>{textAnswer.length} / 10,000 characters</p>
      </div>

      {assignmentConfig.type === 'text_and_links' && (
        <div className='space-y-2 text-start'>
          <Label>Links (GitHub, Video, Demo, etc.)</Label>
          <div className='space-y-2'>
            {links.map((link, index) => (
              <div key={index} className='flex gap-2'>
                <Input
                  value={link}
                  onChange={(e) => {
                    setLinks((prev) => {
                      const next = [...prev]
                      next[index] = e.target.value
                      return next
                    })
                  }}
                  placeholder='https://github.com/your-project'
                  className={errors[`link_${index}`] ? 'border-red-500' : ''}
                />
                {links.length > 1 && (
                  <Button type='button' variant='outline' onClick={() => removeLinkField(index)}>
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
          {errors.links && <p className='text-sm text-red-600'>{errors.links}</p>}

          {links.length < 5 && (
            <Button type='button' variant='outline' size='sm' onClick={addLinkField}>
              + Add Link
            </Button>
          )}
        </div>
      )}

      {assignmentConfig.type === 'video_upload' && (
        <div className='space-y-2 text-start'>
          <Label className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video Upload {assignmentConfig.required && <span className='text-red-600'>*</span>}
          </Label>
          <div className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!uploadedVideoUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Select Video File
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Video uploaded successfully</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadedVideoUrl(null)
                    setVideoFile(null)
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {errors.video && <p className='text-sm text-red-600 mt-1'>{errors.video}</p>}
            <p className="text-xs text-gray-500 mt-1">Max file size: 100MB. Supported formats: MP4, WebM, MOV.</p>
          </div>
        </div>
      )}

      <div className='flex justify-between pt-2'>
        <Button variant='outline' onClick={onPrevious} disabled={!onPrevious}>
          Previous
        </Button>
        <Button onClick={validateAndSubmit}>Next</Button>
      </div>
    </div>
  )
}
