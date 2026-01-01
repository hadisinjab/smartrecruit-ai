import { z } from 'zod'

export const createInterviewSchema = z.object({
  application_id: z.string().uuid('Invalid application ID'),
  audio_or_video_url: z
    .string()
    .url('Please enter a valid URL')
    .min(1, 'Interview link is required'),
  notes: z.string().max(1000, 'Notes too long (max 1,000 characters)').optional(),
})

export const updateInterviewSchema = z.object({
  audio_or_video_url: z.string().url('Please enter a valid URL').optional(),
  audio_analysis: z.any().optional(),
})




