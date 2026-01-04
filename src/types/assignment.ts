export type AssignmentType = 'text_only' | 'text_and_links'

/**
 * DB shape (as stored in Postgres). `link_fields` is stored as a JSON string in a TEXT column.
 */
export interface Assignment {
  id: string
  application_id: string
  type: AssignmentType
  text_fields: string | null
  link_fields: string | null
  created_at: string
}

/**
 * API shape (what server actions return). `link_fields` is parsed back to an array of URLs.
 */
export interface AssignmentResponse extends Omit<Assignment, 'link_fields'> {
  link_fields: string[] | null
}

export interface CreateAssignmentInput {
  application_id: string
  type: AssignmentType
  text_fields?: string
  link_fields?: string[]
}










