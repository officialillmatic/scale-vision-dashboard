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
  const endTime = retellCall.end_timestamp ? new Date(retellCall.end_timestamp * 1000) : null;
  
  // Calculate revenue based on duration and agent rate (default 0.17 per minute)
  const durationMinutes = retellCall.duration_sec / 60;
  const ratePerMinute = 0.17; // This should be fetched from agent rate, but using default for now
  const calculatedRevenue = durationMinutes * ratePerMinute;
  
  // Sanitize phone numbers for privacy if they exist
  const sanitizePhoneNumber = (phoneNumber?: string): string | null => {
    if (!phoneNumber || phoneNumber === 'unknown') return null;
    
    // Keep the phone number as is for now, but could be masked for privacy
    return phoneNumber;
  };

  const mappedCall = {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    retell_agent_id: retellCall.agent_id,
    start_timestamp: timestamp.toISOString(),
    end_timestamp: endTime?.toISOString() || null,
    duration_sec: retellCall.duration_sec || 0,
    duration: retellCall.duration_sec || 0, // New convenience column
    cost_usd: retellCall.cost || 0,
    revenue_amount: calculatedRevenue,
    revenue: calculatedRevenue, // New convenience column
    billing_duration_sec: retellCall.duration_sec || 0,
    rate_per_minute: ratePerMinute,
    call_status: retellCall.call_status || 'unknown',
    status: retellCall.call_status || 'unknown', // New convenience column
    from_number: sanitizePhoneNumber(retellCall.from_number),
    to_number: sanitizePhoneNumber(retellCall.to_number),
    disconnection_reason: retellCall.disconnection_reason || null,
    recording_url: retellCall.recording_url || null,
    transcript: retellCall.transcript || null,
    transcript_url: retellCall.transcript_url || null,
    sentiment: retellCall.sentiment?.overall_sentiment || null,
    sentiment_score: retellCall.sentiment?.score || null,
    result_sentiment: retellCall.sentiment ? JSON.stringify(retellCall.sentiment) : null,
    disposition: retellCall.disposition || null,
    latency_ms: retellCall.latency_ms || null,
    call_summary: retellCall.summary || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log(`[DATA_MAPPER] Successfully mapped call ${retellCall.call_id} with revenue ${calculatedRevenue.toFixed(2)}`);
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
