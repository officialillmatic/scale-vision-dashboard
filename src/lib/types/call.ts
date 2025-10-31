
export interface Call {
  id: string;
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id?: string;
  timestamp: string;
  start_time?: string;
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
}

export interface CallOutcome {
  name: string;
  value: number;
  color: string;
}
