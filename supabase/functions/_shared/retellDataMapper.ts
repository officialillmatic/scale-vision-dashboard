
export interface RetellCallData {
  call_id: string;
  agent_id: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  duration?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  call_status?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment_score?: number;
  sentiment?: string;
  disposition?: string;
  latency_ms?: number;
}

export interface DatabaseCallData {
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id: string;
  timestamp: string;
  start_time?: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  from: string;
  to: string;
  from_number?: string;
  to_number?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment?: string;
  sentiment_score?: number;
  disposition?: string;
  disconnection_reason?: string;
  latency_ms?: number;
  call_type: string;
  call_summary?: string;
}

export function mapRetellCallToDatabase(
  retellCall: RetellCallData,
  userId: string,
  companyId: string,
  agentId: string,
  ratePerMinute: number = 0.02
): DatabaseCallData {
  const durationSec = retellCall.duration || 0;
  const costUsd = (durationSec * ratePerMinute) / 60;
  
  return {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    timestamp: retellCall.start_timestamp 
      ? new Date(retellCall.start_timestamp).toISOString()
      : new Date().toISOString(),
    start_time: retellCall.start_timestamp 
      ? new Date(retellCall.start_timestamp).toISOString()
      : null,
    duration_sec: durationSec,
    cost_usd: costUsd,
    call_status: retellCall.call_status || 'unknown',
    from: retellCall.from_number || 'unknown',
    to: retellCall.to_number || 'unknown',
    from_number: retellCall.from_number,
    to_number: retellCall.to_number,
    recording_url: retellCall.recording_url,
    transcript: retellCall.transcript,
    transcript_url: retellCall.transcript_url,
    sentiment: retellCall.sentiment,
    sentiment_score: retellCall.sentiment_score,
    disposition: retellCall.disposition,
    disconnection_reason: retellCall.disconnection_reason,
    latency_ms: retellCall.latency_ms,
    call_type: 'phone_call',
    call_summary: null
  };
}

export function validateCallData(callData: DatabaseCallData): string[] {
  const errors: string[] = [];
  
  if (!callData.call_id) {
    errors.push('call_id is required');
  }
  
  if (!callData.user_id) {
    errors.push('user_id is required');
  }
  
  if (!callData.company_id) {
    errors.push('company_id is required');
  }
  
  if (!callData.agent_id) {
    errors.push('agent_id is required');
  }
  
  if (callData.duration_sec < 0) {
    errors.push('duration_sec must be non-negative');
  }
  
  if (callData.cost_usd < 0) {
    errors.push('cost_usd must be non-negative');
  }
  
  return errors;
}
