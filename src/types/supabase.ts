export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'super-admin' | 'admin' | 'reviewer'
          organization_id: string | null
          full_name: string | null
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: 'super-admin' | 'admin' | 'reviewer'
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'super-admin' | 'admin' | 'reviewer'
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      job_forms: {
        Row: {
          id: string
          organization_id: string | null
          title: string
          description: string | null
          status: 'draft' | 'active' | 'paused' | 'closed' | 'archived'
          deadline: string | null
          evaluation_criteria: Json | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          title: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'closed' | 'archived'
          deadline?: string | null
          evaluation_criteria?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          title?: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'closed' | 'archived'
          deadline?: string | null
          evaluation_criteria?: Json | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          job_form_id: string | null
          page_number: number
          type: string
          label: string
          required: boolean
          config: Json | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          job_form_id?: string | null
          page_number?: number
          type: string
          label: string
          required?: boolean
          config?: Json | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          job_form_id?: string | null
          page_number?: number
          type?: string
          label?: string
          required?: boolean
          config?: Json | null
          order_index?: number
          created_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_form_id: string | null
          candidate_email: string | null
          candidate_name: string | null
          status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'duplicate'
          is_duplicate: boolean
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_form_id?: string | null
          candidate_email?: string | null
          candidate_name?: string | null
          status?: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'duplicate'
          is_duplicate?: boolean
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_form_id?: string | null
          candidate_email?: string | null
          candidate_name?: string | null
          status?: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'duplicate'
          is_duplicate?: boolean
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          application_id: string | null
          question_id: string | null
          value: string | null
          voice_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          question_id?: string | null
          value?: string | null
          voice_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          question_id?: string | null
          value?: string | null
          voice_data?: Json | null
          created_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          application_id: string | null
          file_url: string
          parsed_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          file_url: string
          parsed_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          file_url?: string
          parsed_data?: Json | null
          created_at?: string
        }
      }
      external_profiles: {
        Row: {
          id: string
          application_id: string | null
          type: string | null
          url: string | null
          parsed_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          type?: string | null
          url?: string | null
          parsed_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          type?: string | null
          url?: string | null
          parsed_data?: Json | null
          created_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          application_id: string | null
          type: string | null
          text_fields: string | null
          link_fields: string | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          type?: string | null
          text_fields?: string | null
          link_fields?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          type?: string | null
          text_fields?: string | null
          link_fields?: string | null
          created_at?: string
        }
      }
      interviews: {
        Row: {
          id: string
          application_id: string | null
          audio_or_video_url: string | null
          audio_analysis: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          audio_or_video_url?: string | null
          audio_analysis?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          audio_or_video_url?: string | null
          audio_analysis?: Json | null
          created_at?: string
        }
      }
      ai_evaluations: {
        Row: {
          id: string
          application_id: string | null
          score: number | null
          ranking_score: number | null
          strengths: string[] | null
          weaknesses: string[] | null
          recommendation: string | null
          analysis: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          score?: number | null
          ranking_score?: number | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          recommendation?: string | null
          analysis?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          score?: number | null
          ranking_score?: number | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          recommendation?: string | null
          analysis?: Json | null
          created_at?: string
        }
      }
      hr_evaluations: {
        Row: {
          id: string
          application_id: string | null
          evaluator_id: string | null
          hr_score: number | null
          hr_decision: 'approve' | 'reject' | 'hold' | 'interview' | null
          next_action_date: string | null
          hr_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id?: string | null
          evaluator_id?: string | null
          hr_score?: number | null
          hr_decision?: 'approve' | 'reject' | 'hold' | 'interview' | null
          next_action_date?: string | null
          hr_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string | null
          evaluator_id?: string | null
          hr_score?: number | null
          hr_decision?: 'approve' | 'reject' | 'hold' | 'interview' | null
          next_action_date?: string | null
          hr_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      active_log: {
        Row: {
          id: string
          actor_id: string | null
          actor_role: string | null
          action: string
          entity_type: string
          entity_id: string | null
          job_form_id: string | null
          application_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_role?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          job_form_id?: string | null
          application_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_role?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          job_form_id?: string | null
          application_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string | null
          title: string | null
          content: string | null
          is_read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type?: string | null
          title?: string | null
          content?: string | null
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string | null
          title?: string | null
          content?: string | null
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          key: string
          value: string | null
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: string | null
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string | null
          description?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_: string]: {
        Row: {
          [key: string]: Json
        }
        Relations: {
          [key: string]: Json
        }
      }
    }
    Functions: {
      [_: string]: {
        Args: {
          [key: string]: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_: string]: string
    }
  }
}
