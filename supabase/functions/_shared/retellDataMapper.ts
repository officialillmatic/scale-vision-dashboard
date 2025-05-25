
// Retell API data mapping utilities
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

export function mapRetellCallToDatabase(
  retellCall: RetellCallData,
  userId: string,
  companyId: string,
  agentId: string,
  ratePerMinute: number = 0.02
) {
  const durationSec = retellCall.duration || 0;
  const costUsd = (durationSec * ratePerMinute) / 60;

  return {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    timestamp: retellCall.start_timestamp ? new Date(retellCall.start_timestamp).toISOString() : new Date().toISOString(),
    start_time: retellCall.start_timestamp ? new Date(retellCall.start_timestamp).toISOString() : null,
    duration_sec: durationSec,
    cost_usd: costUsd,
    call_status: retellCall.call_status || 'completed',
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
    latency_ms: retellCall.latency_ms || 0,
    call_type: 'phone_call' as const,
    call_summary: null
  };
}

export function validateCallData(callData: any): string[] {
  const errors: string[] = [];
  
  if (!callData.call_id) {
    errors.push('Missing call_id');
  }
  
  if (!callData.user_id) {
    errors.push('Missing user_id');
  }
  
  if (!callData.company_id) {
    errors.push('Missing company_id');
  }
  
  if (callData.duration_sec < 0) {
    errors.push('Invalid duration_sec');
  }
  
  if (callData.cost_usd < 0) {
    errors.push('Invalid cost_usd');
  }
  
  return errors;
}
