export interface Database {
  public: {
    Tables: {
      answers: {
        Row: {
          id: string
          application_id: string
          question_id: string
          value: string | null
          voice_data: Record<string, any> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          question_id: string
          value?: string | null
          voice_data?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          question_id?: string
          value?: string | null
          voice_data?: Record<string, any> | null
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_form_id: string
          candidate_name: string | null
          candidate_email: string | null
          status: string
          is_duplicate: boolean
          submitted_at: string | null
          created_at: string
          updated_at: string
          last_progress_step?: string | null
          last_progress_event?: string | null
          last_progress_at?: string | null
          last_progress_meta?: any | null
        }
        Insert: {
          id?: string
          job_form_id?: string
          candidate_name?: string | null
          candidate_email?: string | null
          status?: string
          is_duplicate?: boolean
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          last_progress_step?: string | null
          last_progress_event?: string | null
          last_progress_at?: string | null
          last_progress_meta?: any | null
        }
        Update: {
          id?: string
          job_form_id?: string
          candidate_name?: string | null
          candidate_email?: string | null
          status?: string
          is_duplicate?: boolean
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
          last_progress_step?: string | null
          last_progress_event?: string | null
          last_progress_at?: string | null
          last_progress_meta?: any | null
        }
      }
      job_forms: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          department: string | null
          location: string | null
          type: string | null
          salary_min: number | null
          salary_max: number | null
          salary_currency: string | null
          requirements: any | null
          benefits: any | null
          deadline: string | null
          assignment_enabled: boolean
          assignment_required: boolean
          assignment_type: string | null
          assignment_description: string | null
          assignment_weight: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          department?: string | null
          location?: string | null
          type?: string | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string | null
          requirements?: any | null
          benefits?: any | null
          deadline?: string | null
          assignment_enabled?: boolean
          assignment_required?: boolean
          assignment_type?: string | null
          assignment_description?: string | null
          assignment_weight?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          department?: string | null
          location?: string | null
          type?: string | null
          salary_min?: number | null
          salary_max?: number | null
          salary_currency?: string | null
          requirements?: any | null
          benefits?: any | null
          deadline?: string | null
          assignment_enabled?: boolean
          assignment_required?: boolean
          assignment_type?: string | null
          assignment_description?: string | null
          assignment_weight?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          job_form_id: string
          type: string
          label: string
          required: boolean
          page_number: number
          config: any | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_form_id: string
          type: string
          label: string
          required?: boolean
          page_number?: number
          config?: any | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_form_id?: string
          type?: string
          label?: string
          required?: boolean
          page_number?: number
          config?: any | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          application_id: string
          file_url: string
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          file_url: string
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          file_url?: string
          created_at?: string
        }
      }
      application_progress_events: {
        Row: {
          id: string
          application_id: string
          step_id: string
          event_type: string
          meta: any | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id: string
          step_id: string
          event_type: string
          meta?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          step_id?: string
          event_type?: string
          meta?: any | null
          created_at?: string
        }
      }
    }
  }
}