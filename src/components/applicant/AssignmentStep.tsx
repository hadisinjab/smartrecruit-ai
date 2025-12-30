'use client'

import React, { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type AssignmentType = 'text_only' | 'text_and_links'

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

  const validLinks = useMemo(() => links.map((l) => l.trim()).filter(Boolean), [links])

  const validateAndSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (assignmentConfig.required && !textAnswer.trim()) {
      newErrors.text = 'Please provide your solution'
    }

    if (textAnswer.length > 10000) {
      newErrors.text = 'Text is too long (max 10,000 characters)'
    }

    if (textAnswer.trim().length > 0 && textAnswer.trim().length < 50) {
      newErrors.text = 'Please provide at least 50 characters'
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onNext({
      text_fields: textAnswer,
      link_fields: assignmentConfig.type === 'text_and_links' ? validLinks : [],
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

      <div className='space-y-2 text-start'>
        <Label htmlFor='assignment-text'>
          Your Solution {assignmentConfig.required && <span className='text-red-600'>*</span>}
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

      <div className='flex justify-between pt-2'>
        <Button variant='outline' onClick={onPrevious} disabled={!onPrevious}>
          Previous
        </Button>
        <Button onClick={validateAndSubmit}>Next</Button>
      </div>
    </div>
  )
}


