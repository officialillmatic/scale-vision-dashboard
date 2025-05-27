
export interface RetellCallData {
  call_id: string;
  agent_id: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
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

export function mapRetellCallToSupabase(
  retellCall: RetellCallData,
  userId: string,
  companyId: string,
  agentId: string
) {
  // Convert timestamp to ISO string
  const timestamp = retellCall.start_timestamp 
    ? new Date(retellCall.start_timestamp * 1000).toISOString()
    : new Date().toISOString();

  const endTime = retellCall.end_timestamp
    ? new Date(retellCall.end_timestamp * 1000).toISOString()
    : null;

  // Calculate duration in seconds (prefer duration over duration_ms)
  const durationSec = retellCall.duration || 
    (retellCall.duration_ms ? Math.round(retellCall.duration_ms / 1000) : 0);

  // Calculate cost based on duration and rate (default rate: $0.02/min)
  const costUsd = durationSec > 0 ? Number((durationSec / 60 * 0.02).toFixed(4)) : 0;

  return {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    timestamp,
    start_time: timestamp,
    duration_sec: durationSec,
    cost_usd: costUsd,
    sentiment: retellCall.sentiment || null,
    sentiment_score: retellCall.sentiment_score || null,
    disconnection_reason: retellCall.disconnection_reason || null,
    call_status: retellCall.call_status || 'unknown',
    from: retellCall.from_number || 'unknown',
    to: retellCall.to_number || 'unknown',
    from_number: retellCall.from_number || null,
    to_number: retellCall.to_number || null,
    recording_url: retellCall.recording_url || null,
    audio_url: retellCall.recording_url || null,
    transcript: retellCall.transcript || null,
    transcript_url: retellCall.transcript_url || null,
    disposition: retellCall.disposition || null,
    latency_ms: retellCall.latency_ms || 0,
    call_type: 'phone_call',
    call_summary: null
  };
}
