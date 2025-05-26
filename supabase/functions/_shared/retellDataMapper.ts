
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
    cost_usd: Math.round(costUsd * 10000) / 10000, // Round to 4 decimal places
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
    call_summary: null,
    audio_url: retellCall.recording_url // Map recording_url to audio_url as well for compatibility
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
    errors.push('Invalid duration_sec: must be non-negative');
  }
  
  if (callData.cost_usd < 0) {
    errors.push('Invalid cost_usd: must be non-negative');
  }

  // Validate timestamp format
  if (callData.timestamp && isNaN(Date.parse(callData.timestamp))) {
    errors.push('Invalid timestamp format');
  }

  // Validate sentiment score if provided
  if (callData.sentiment_score !== null && callData.sentiment_score !== undefined) {
    if (typeof callData.sentiment_score !== 'number' || callData.sentiment_score < -1 || callData.sentiment_score > 1) {
      errors.push('Invalid sentiment_score: must be a number between -1 and 1');
    }
  }

  // Validate URLs if provided
  const urlFields = ['recording_url', 'transcript_url', 'audio_url'];
  urlFields.forEach(field => {
    if (callData[field]) {
      try {
        new URL(callData[field]);
      } catch {
        errors.push(`Invalid ${field}: must be a valid URL`);
      }
    }
  });
  
  return errors;
}

// Helper function to sanitize call data before database insertion
export function sanitizeCallData(callData: any) {
  const sanitized = { ...callData };
  
  // Ensure numeric fields are properly typed
  if (sanitized.duration_sec) sanitized.duration_sec = Number(sanitized.duration_sec);
  if (sanitized.cost_usd) sanitized.cost_usd = Number(sanitized.cost_usd);
  if (sanitized.latency_ms) sanitized.latency_ms = Number(sanitized.latency_ms);
  if (sanitized.sentiment_score) sanitized.sentiment_score = Number(sanitized.sentiment_score);
  
  // Ensure boolean fields are properly typed
  // (none currently, but this is where they would go)
  
  // Truncate long text fields to prevent database errors
  const maxTextLength = 10000; // Adjust based on your database schema
  if (sanitized.transcript && sanitized.transcript.length > maxTextLength) {
    sanitized.transcript = sanitized.transcript.substring(0, maxTextLength) + '... [truncated]';
  }
  
  if (sanitized.call_summary && sanitized.call_summary.length > maxTextLength) {
    sanitized.call_summary = sanitized.call_summary.substring(0, maxTextLength) + '... [truncated]';
  }
  
  return sanitized;
}
