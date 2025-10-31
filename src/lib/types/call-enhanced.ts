
// Enhanced call types with consolidated interfaces
export interface EnhancedCallData {
  id: string;
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id?: string;
  timestamp: Date;
  start_time?: Date;
  duration_sec: number;
  cost_usd: number;
  sentiment?: string;
  sentiment_score?: number;
  disconnection_reason?: string;
  call_status: string;
  from: string;
  to: string;
  from_number?: string;
  to_number?: string;
  audio_url?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  call_type: string;
  call_summary?: string;
  disposition?: string;
  latency_ms?: number;
  result_sentiment?: any;
  agent?: {
    id: string;
    name: string;
    rate_per_minute?: number;
  };
}

export interface CallMetrics {
  total_calls: number;
  total_duration_min: number;
  avg_duration_sec: number;
  total_cost: number;
}

export interface CallOutcome {
  name: string;
  value: number;
  color: string;
}

export type CallStatus = 'completed' | 'user_hangup' | 'dial_no_answer' | 'voicemail' | 'failed' | 'unknown';
export type CallDisposition = 'enrolled' | 'completed' | 'success' | 'no_answer' | 'voicemail' | 'busy' | 'declined' | 'failed' | 'error';
export type SentimentLevel = 'positive' | 'neutral' | 'negative' | 'unknown';

export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp?: number;
}

export interface CallFilters {
  searchTerm: string;
  date?: Date;
  status?: CallStatus;
  disposition?: CallDisposition;
}
