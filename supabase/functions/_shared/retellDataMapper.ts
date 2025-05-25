
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
  console.log(`[MAPPER] Mapping call ${retellCall.call_id}:`, {
    has_duration_ms: !!retellCall.duration_ms,
    has_duration: !!retellCall.duration,
    has_timestamps: !!(retellCall.start_timestamp && retellCall.end_timestamp),
    rate_per_minute: ratePerMinute
  });

  // Calculate duration in seconds with enhanced validation
  let durationSec = 0;
  if (retellCall.duration_ms && retellCall.duration_ms > 0) {
    durationSec = Math.round(retellCall.duration_ms / 1000);
    console.log(`[MAPPER] Using duration_ms: ${retellCall.duration_ms}ms -> ${durationSec}s`);
  } else if (retellCall.duration && retellCall.duration > 0) {
    durationSec = Math.round(retellCall.duration);
    console.log(`[MAPPER] Using duration: ${retellCall.duration}s`);
  } else if (retellCall.start_timestamp && retellCall.end_timestamp) {
    const calculatedDuration = Math.round((retellCall.end_timestamp - retellCall.start_timestamp) / 1000);
    durationSec = Math.max(0, calculatedDuration);
    console.log(`[MAPPER] Calculated duration from timestamps: ${durationSec}s`);
  } else {
    console.warn(`[MAPPER] No duration data available for call ${retellCall.call_id}`);
  }

  // Calculate cost with proper validation
  const durationMin = Math.max(0, durationSec / 60);
  const costUsd = Math.round(durationMin * ratePerMinute * 10000) / 10000; // Round to 4 decimal places
  console.log(`[MAPPER] Cost calculation: ${durationMin}min * $${ratePerMinute}/min = $${costUsd}`);

  // Format timestamp with proper validation
  let startTime: string;
  if (retellCall.start_timestamp && retellCall.start_timestamp > 0) {
    try {
      // Handle both seconds and milliseconds timestamps
      const timestamp = retellCall.start_timestamp > 1e12 
        ? retellCall.start_timestamp  // Already in milliseconds
        : retellCall.start_timestamp * 1000; // Convert seconds to milliseconds
      
      startTime = new Date(timestamp).toISOString();
      console.log(`[MAPPER] Parsed start_timestamp: ${retellCall.start_timestamp} -> ${startTime}`);
    } catch (error) {
      console.warn(`[MAPPER] Invalid start_timestamp ${retellCall.start_timestamp}, using current time:`, error);
      startTime = new Date().toISOString();
    }
  } else {
    startTime = new Date().toISOString();
    console.log(`[MAPPER] No start_timestamp, using current time: ${startTime}`);
  }

  // Validate and clean phone numbers
  const cleanPhoneNumber = (phone?: string): string => {
    if (!phone || phone.trim() === '') return 'unknown';
    // Remove any non-phone characters but keep + for international numbers
    const cleaned = phone.trim().replace(/[^+\d\-\(\)\s]/g, '');
    return cleaned || 'unknown';
  };

  const fromNumber = cleanPhoneNumber(retellCall.from_number);
  const toNumber = cleanPhoneNumber(retellCall.to_number);

  // Validate and clean text fields
  const cleanString = (str?: string): string | undefined => {
    if (!str) return undefined;
    const cleaned = str.trim();
    return cleaned.length > 0 ? cleaned : undefined;
  };

  const mappedData: MappedCallData = {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    from_number: fromNumber,
    to_number: toNumber,
    from: fromNumber, // backward compatibility
    to: toNumber, // backward compatibility
    duration_sec: durationSec,
    start_time: startTime,
    timestamp: startTime, // backward compatibility
    cost_usd: costUsd,
    call_status: retellCall.call_status || 'completed',
    disconnection_reason: cleanString(retellCall.disconnection_reason),
    recording_url: cleanString(retellCall.recording_url),
    transcript: cleanString(retellCall.transcript),
    transcript_url: cleanString(retellCall.transcript_url),
    sentiment_score: retellCall.sentiment_score,
    sentiment: retellCall.sentiment || 'neutral',
    disposition: cleanString(retellCall.disposition),
    latency_ms: Math.max(0, retellCall.latency_ms || 0),
    call_type: 'phone_call',
    audio_url: cleanString(retellCall.recording_url) // backward compatibility
  };

  console.log(`[MAPPER] Mapped call ${retellCall.call_id} successfully`);
  return mappedData;
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

  // Validate phone numbers are not empty
  if (callData.from_number === '' || callData.to_number === '') {
    errors.push('Phone numbers cannot be empty strings');
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
    disconnection_reason: callData.disconnection_reason?.trim() || undefined,
    transcript: callData.transcript?.trim() || undefined,
    disposition: callData.disposition?.trim() || undefined,
    recording_url: callData.recording_url?.trim() || undefined,
    transcript_url: callData.transcript_url?.trim() || undefined,
    audio_url: callData.audio_url?.trim() || undefined,
  };
}
