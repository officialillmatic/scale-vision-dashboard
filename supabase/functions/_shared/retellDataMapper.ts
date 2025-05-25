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
  // Calculate duration in seconds with enhanced validation
  let durationSec = 0;
  if (retellCall.duration_ms && retellCall.duration_ms > 0) {
    durationSec = Math.round(retellCall.duration_ms / 1000);
  } else if (retellCall.duration && retellCall.duration > 0) {
    durationSec = Math.round(retellCall.duration);
  } else if (retellCall.start_timestamp && retellCall.end_timestamp) {
    const calculatedDuration = Math.round((retellCall.end_timestamp - retellCall.start_timestamp) / 1000);
    durationSec = Math.max(0, calculatedDuration); // Ensure non-negative
  }

  // Calculate cost with proper validation
  const durationMin = Math.max(0, durationSec / 60);
  const costUsd = Math.round(durationMin * ratePerMinute * 10000) / 10000; // Round to 4 decimal places

  // Format timestamp with proper validation
  let startTime: string;
  if (retellCall.start_timestamp && retellCall.start_timestamp > 0) {
    try {
      startTime = new Date(retellCall.start_timestamp).toISOString();
    } catch (error) {
      console.warn('Invalid start_timestamp, using current time:', retellCall.start_timestamp);
      startTime = new Date().toISOString();
    }
  } else {
    startTime = new Date().toISOString();
  }

  // Validate and clean phone numbers
  const cleanPhoneNumber = (phone?: string): string => {
    if (!phone || phone.trim() === '') return 'unknown';
    // Remove any non-phone characters but keep + for international numbers
    const cleaned = phone.trim().replace(/[^+\d\-\(\)\s]/g, '');
    return cleaned || 'unknown';
  };

  return {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    from_number: cleanPhoneNumber(retellCall.from_number),
    to_number: cleanPhoneNumber(retellCall.to_number),
    from: cleanPhoneNumber(retellCall.from_number),
    to: cleanPhoneNumber(retellCall.to_number),
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
    latency_ms: Math.max(0, retellCall.latency_ms || 0),
    call_type: 'phone_call',
    audio_url: retellCall.recording_url
  };
}

export function validateCallData(callData: Partial<MappedCallData>): string[] {
  const errors: string[] = [];
  
  if (!callData.call_id || callData.call_id.trim() === '') {
    errors.push('Missing or empty call_id');
  }
  
  if (!callData.user_id || callData.user_id.trim() === '') {
    errors.push('Missing or empty user_id');
  }
  
  if (!callData.company_id || callData.company_id.trim() === '') {
    errors.push('Missing or empty company_id');
  }
  
  if (!callData.agent_id || callData.agent_id.trim() === '') {
    errors.push('Missing or empty agent_id');
  }

  if (callData.duration_sec !== undefined && callData.duration_sec < 0) {
    errors.push('Duration cannot be negative');
  }

  if (callData.cost_usd !== undefined && callData.cost_usd < 0) {
    errors.push('Cost cannot be negative');
  }

  if (callData.latency_ms !== undefined && callData.latency_ms < 0) {
    errors.push('Latency cannot be negative');
  }

  // Validate timestamp format
  if (callData.start_time || callData.timestamp) {
    const timeToCheck = callData.start_time || callData.timestamp;
    try {
      const date = new Date(timeToCheck!);
      if (isNaN(date.getTime())) {
        errors.push('Invalid timestamp format');
      }
    } catch (error) {
      errors.push('Invalid timestamp format');
    }
  }
  
  return errors;
}

// Utility function to sanitize call data before database insertion
export function sanitizeCallData(callData: MappedCallData): MappedCallData {
  return {
    ...callData,
    // Ensure all string fields are properly trimmed and not just whitespace
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
    // Ensure numeric fields are properly bounded
    duration_sec: Math.max(0, callData.duration_sec),
    cost_usd: Math.max(0, callData.cost_usd),
    latency_ms: Math.max(0, callData.latency_ms),
    // Clean optional string fields
    disconnection_reason: callData.disconnection_reason?.trim() || null,
    transcript: callData.transcript?.trim() || null,
    disposition: callData.disposition?.trim() || null,
  };
}
