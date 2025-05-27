
export interface WebhookPayload {
  event: string;
  call: any;
  timestamp: string;
}

export interface WebhookLog {
  id: string;
  event_type: string;
  call_id?: string;
  agent_id?: string;
  user_id?: string;
  company_id?: string;
  status: 'success' | 'error';
  processing_time_ms?: number;
  duration_sec?: number;
  cost_usd?: number;
  created_at: string;
}
