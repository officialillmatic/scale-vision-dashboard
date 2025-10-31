
export interface CallData {
  id: string;
  call_id: string;
  timestamp: Date;
  duration_sec: number;
  cost_usd: number;
  sentiment?: string;
  sentiment_score?: number | null;
  disconnection_reason?: string | null;
  call_status: string;
  from?: string;
  to?: string;
  from_number?: string;
  to_number?: string;
  audio_url?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  user_id: string;
  company_id?: string;
  call_type?: string;
  latency_ms?: number;
  call_summary?: string;
  disposition?: string | null;
  agent?: {
    id: string;
    name: string;
    rate_per_minute: number;
    retell_agent_id?: string;
  };
}
