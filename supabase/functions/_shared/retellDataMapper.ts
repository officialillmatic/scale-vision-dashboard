
// Retell API data mapping utilities
export interface RetellCallData {
  call_id: string;
  agent_id: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration?: number;
  duration_ms?: number;
  call_status?: string;
  disconnection_reason?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment_score?: number;
  sentiment?: string;
  disposition?: string;
  latency_ms?: number;
}

export interface MappedCallData {
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id: string;
  from_number: string;
  to_number: string;
  from: string; // backward compatibility
  to: string; // backward compatibility
  duration_sec: number;
  start_time: string;
  timestamp: string; // backward compatibility
  cost_usd: number;
  call_status: string;
  disconnection_reason?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment_score?: number;
  sentiment?: string;
  disposition?: string;
  latency_ms: number;
  call_type: string;
  audio_url?: string; // backward compatibility
}

export function mapRetellCallToDatabase(
  retellCall: RetellCallData,
  userId: string,
  companyId: string,
  agentId: string,
  ratePerMinute: number
): MappedCallData {
  // Calculate duration in seconds
  let durationSec = 0;
  if (retellCall.duration_ms) {
    durationSec = Math.round(retellCall.duration_ms / 1000);
  } else if (retellCall.duration) {
    durationSec = Math.round(retellCall.duration);
  } else if (retellCall.start_timestamp && retellCall.end_timestamp) {
    durationSec = Math.round((retellCall.end_timestamp - retellCall.start_timestamp) / 1000);
  }

  // Calculate cost
  const durationMin = durationSec / 60;
  const costUsd = durationMin * ratePerMinute;

  // Format timestamp
  const startTime = retellCall.start_timestamp 
    ? new Date(retellCall.start_timestamp).toISOString()
    : new Date().toISOString();

  return {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    from_number: retellCall.from_number || 'unknown',
    to_number: retellCall.to_number || 'unknown',
    from: retellCall.from_number || 'unknown',
    to: retellCall.to_number || 'unknown',
    duration_sec: durationSec,
    start_time: startTime,
    timestamp: startTime,
    cost_usd: costUsd,
    call_status: retellCall.call_status || 'completed',
    disconnection_reason: retellCall.disconnection_reason,
    recording_url: retellCall.recording_url,
    transcript: retellCall.transcript,
    transcript_url: retellCall.transcript_url,
    sentiment_score: retellCall.sentiment_score,
    sentiment: retellCall.sentiment || 'neutral',
    disposition: retellCall.disposition,
    latency_ms: retellCall.latency_ms || 0,
    call_type: 'phone_call',
    audio_url: retellCall.recording_url
  };
}

export function validateCallData(callData: Partial<MappedCallData>): string[] {
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
  
  if (!callData.agent_id) {
    errors.push('Missing agent_id');
  }
  
  return errors;
}
