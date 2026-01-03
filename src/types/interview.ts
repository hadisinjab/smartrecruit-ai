export interface Interview {
  id: string;
  application_id: string;
  audio_or_video_url: string;
  audio_analysis: InterviewAnalysis | null;
  created_at: string;
}

export interface InterviewAnalysis {
  overall_score: number;
  confidence_level: number;
  clarity: number;
  stress_level: 'low' | 'medium' | 'high';
  communication_quality: string;
  strengths: string[];
  weaknesses: string[];
  notable_timestamps: {
    time: string;
    note: string;
  }[];
  suggested_follow_up: string[];
  transcript?: string;
}

export interface CreateInterviewInput {
  application_id: string;
  audio_or_video_url: string;
  notes?: string;
}

export interface InterviewWithCandidate extends Interview {
  candidate_name?: string;
  candidate_email?: string;
}







