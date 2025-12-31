import { z } from 'zod'

export const createAssignmentSchema = z.object({
  application_id: z.string().uuid('Invalid application ID'),
  type: z.enum(['text_only', 'text_and_links'], {
    errorMap: () => ({ message: 'Type must be text_only or text_and_links' }),
  }),
  text_fields: z.string().max(10000, 'Text too long (max 10,000 characters)').optional(),
  link_fields: z.array(z.string().url('Invalid URL format')).max(5, 'Maximum 5 links allowed').optional(),
})




