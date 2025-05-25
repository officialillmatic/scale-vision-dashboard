
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
  from: string;
  to: string;
  duration_sec: number;
  start_time: string;
  timestamp: string;
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
  audio_url?: string;
}

export function mapRetellCallToDatabase(
  retellCall: RetellCallData,
  userId: string,
  companyId: string,
  agentId: string,
  ratePerMinute: number
): MappedCallData {
  console.log(`[MAPPER] Mapping call ${retellCall.call_id} with required fields:`, {
    userId,
    companyId,
    agentId,
    ratePerMinute
  });

  // Validate required fields
  if (!userId || !companyId || !agentId) {
    throw new Error('Missing required fields: userId, companyId, or agentId cannot be null');
  }

  // Calculate duration in seconds with enhanced validation
  let durationSec = 0;
  if (retellCall.duration_ms && retellCall.duration_ms > 0) {
    durationSec = Math.round(retellCall.duration_ms / 1000);
  } else if (retellCall.duration && retellCall.duration > 0) {
    durationSec = Math.round(retellCall.duration);
  } else if (retellCall.start_timestamp && retellCall.end_timestamp) {
    const calculatedDuration = Math.round((retellCall.end_timestamp - retellCall.start_timestamp) / 1000);
    durationSec = Math.max(0, calculatedDuration);
  }

  // Calculate cost with proper validation
  const durationMin = Math.max(0, durationSec / 60);
  const costUsd = Math.round(durationMin * ratePerMinute * 10000) / 10000;

  // Format timestamp with proper validation
  let startTime: string;
  if (retellCall.start_timestamp && retellCall.start_timestamp > 0) {
    try {
      const timestamp = retellCall.start_timestamp > 1e12 
        ? retellCall.start_timestamp
        : retellCall.start_timestamp * 1000;
      startTime = new Date(timestamp).toISOString();
    } catch (error) {
      startTime = new Date().toISOString();
    }
  } else {
    startTime = new Date().toISOString();
  }

  // Clean phone numbers
  const cleanPhoneNumber = (phone?: string): string => {
    if (!phone || phone.trim() === '') return 'unknown';
    const cleaned = phone.trim().replace(/[^+\d\-\(\)\s]/g, '');
    return cleaned || 'unknown';
  };

  const fromNumber = cleanPhoneNumber(retellCall.from_number);
  const toNumber = cleanPhoneNumber(retellCall.to_number);

  const mappedData: MappedCallData = {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    from_number: fromNumber,
    to_number: toNumber,
    from: fromNumber,
    to: toNumber,
    duration_sec: durationSec,
    start_time: startTime,
    timestamp: startTime,
    cost_usd: costUsd,
    call_status: retellCall.call_status || 'completed',
    disconnection_reason: retellCall.disconnection_reason?.trim() || undefined,
    recording_url: retellCall.recording_url?.trim() || undefined,
    transcript: retellCall.transcript?.trim() || undefined,
    transcript_url: retellCall.transcript_url?.trim() || undefined,
    sentiment_score: retellCall.sentiment_score,
    sentiment: retellCall.sentiment || 'neutral',
    disposition: retellCall.disposition?.trim() || undefined,
    latency_ms: Math.max(0, retellCall.latency_ms || 0),
    call_type: 'phone_call',
    audio_url: retellCall.recording_url?.trim() || undefined
  };

  console.log(`[MAPPER] Successfully mapped call with all required fields:`, {
    call_id: mappedData.call_id,
    user_id: mappedData.user_id,
    company_id: mappedData.company_id,
    agent_id: mappedData.agent_id
  });

  return mappedData;
}

export function validateCallData(callData: Partial<MappedCallData>): string[] {
  const errors: string[] = [];
  
  if (!callData.call_id?.trim()) {
    errors.push('Missing or empty call_id');
  }
  
  if (!callData.user_id?.trim()) {
    errors.push('Missing or empty user_id');
  }
  
  if (!callData.company_id?.trim()) {
    errors.push('Missing or empty company_id');
  }
  
  if (!callData.agent_id?.trim()) {
    errors.push('Missing or empty agent_id');
  }

  if (callData.duration_sec !== undefined && callData.duration_sec < 0) {
    errors.push('Duration cannot be negative');
  }

  if (callData.cost_usd !== undefined && callData.cost_usd < 0) {
    errors.push('Cost cannot be negative');
  }

  return errors;
}

export function sanitizeCallData(callData: MappedCallData): MappedCallData {
  return {
    ...callData,
    call_id: callData.call_id.trim(),
    user_id: callData.user_id.trim(),
    company_id: callData.company_id.trim(),
    agent_id: callData.agent_id.trim(),
    from_number: callData.from_number.trim() || 'unknown',
    to_number: callData.to_number.trim() || 'unknown',
    from: callData.from.trim() || 'unknown',
    to: callData.to.trim() || 'unknown',
    call_status: callData.call_status.trim() || 'unknown',
    sentiment: callData.sentiment?.trim() || 'neutral',
    call_type: callData.call_type.trim() || 'phone_call',
    duration_sec: Math.max(0, callData.duration_sec),
    cost_usd: Math.max(0, callData.cost_usd),
    latency_ms: Math.max(0, callData.latency_ms),
    disconnection_reason: callData.disconnection_reason?.trim() || undefined,
    transcript: callData.transcript?.trim() || undefined,
    disposition: callData.disposition?.trim() || undefined,
    recording_url: callData.recording_url?.trim() || undefined,
    transcript_url: callData.transcript_url?.trim() || undefined,
    audio_url: callData.audio_url?.trim() || undefined,
  };
}
