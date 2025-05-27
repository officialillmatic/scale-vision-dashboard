
// Data mapping utilities for transforming Retell API responses to Supabase schema

export interface RetellCall {
  call_id: string;
  agent_id: string;
  start_timestamp: number;
  end_timestamp?: number;
  duration_sec: number;
  cost: number;
  call_status: string;
  from_number?: string;
  to_number?: string;
  disconnection_reason?: string;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment?: {
    overall_sentiment?: string;
    score?: number;
  };
  disposition?: string;
  latency_ms?: number;
  summary?: string;
}

export function mapRetellCallToSupabase(
  retellCall: RetellCall,
  userId: string,
  companyId: string,
  agentId: string
) {
  console.log(`[DATA_MAPPER] Mapping call ${retellCall.call_id} for user ${userId}`);
  
  const timestamp = new Date(retellCall.start_timestamp * 1000);
  const startTime = retellCall.start_timestamp ? new Date(retellCall.start_timestamp * 1000) : null;
  
  const mappedCall = {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    timestamp: timestamp.toISOString(),
    start_time: startTime?.toISOString() || null,
    duration_sec: retellCall.duration_sec || 0,
    cost_usd: retellCall.cost || 0,
    call_status: retellCall.call_status || 'unknown',
    from: retellCall.from_number || 'unknown',
    to: retellCall.to_number || 'unknown',
    from_number: retellCall.from_number || null,
    to_number: retellCall.to_number || null,
    disconnection_reason: retellCall.disconnection_reason || null,
    recording_url: retellCall.recording_url || null,
    audio_url: retellCall.recording_url || null, // Backwards compatibility
    transcript: retellCall.transcript || null,
    transcript_url: retellCall.transcript_url || null,
    sentiment: retellCall.sentiment?.overall_sentiment || null,
    sentiment_score: retellCall.sentiment?.score || null,
    result_sentiment: retellCall.sentiment ? JSON.stringify(retellCall.sentiment) : null,
    disposition: retellCall.disposition || null,
    latency_ms: retellCall.latency_ms || null,
    call_type: 'phone_call',
    call_summary: retellCall.summary || null,
  };

  console.log(`[DATA_MAPPER] Successfully mapped call ${retellCall.call_id}`);
  return mappedCall;
}

export function validateRetellCall(call: any): call is RetellCall {
  if (!call || typeof call !== 'object') {
    console.error('[DATA_MAPPER] Invalid call object:', call);
    return false;
  }

  if (!call.call_id || typeof call.call_id !== 'string') {
    console.error('[DATA_MAPPER] Missing or invalid call_id:', call.call_id);
    return false;
  }

  if (!call.agent_id || typeof call.agent_id !== 'string') {
    console.error('[DATA_MAPPER] Missing or invalid agent_id:', call.agent_id);
    return false;
  }

  if (!call.start_timestamp || typeof call.start_timestamp !== 'number') {
    console.error('[DATA_MAPPER] Missing or invalid start_timestamp:', call.start_timestamp);
    return false;
  }

  return true;
}
