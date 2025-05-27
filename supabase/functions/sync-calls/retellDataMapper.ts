
export function mapRetellCallToSupabase(retellCall: any, userId: string, companyId: string, agentId: string) {
  const timestamp = retellCall.start_timestamp ? new Date(retellCall.start_timestamp * 1000) : new Date();
  const duration = retellCall.duration || 0;
  const cost = calculateCallCost(duration);

  return {
    call_id: retellCall.call_id,
    user_id: userId,
    company_id: companyId,
    agent_id: agentId,
    timestamp: timestamp.toISOString(),
    start_time: timestamp.toISOString(),
    duration_sec: duration,
    cost_usd: cost,
    from: retellCall.from_number || 'unknown',
    to: retellCall.to_number || 'unknown',
    from_number: retellCall.from_number,
    to_number: retellCall.to_number,
    call_status: retellCall.call_status || 'unknown',
    disconnection_reason: retellCall.disconnection_reason,
    recording_url: retellCall.recording_url,
    audio_url: retellCall.recording_url,
    transcript: retellCall.transcript,
    transcript_url: retellCall.transcript_url,
    sentiment_score: retellCall.sentiment_score,
    sentiment: retellCall.sentiment?.overall_sentiment || null,
    result_sentiment: retellCall.sentiment,
    disposition: retellCall.disposition,
    latency_ms: retellCall.latency_ms || 0,
    call_type: 'phone_call',
    call_summary: null
  };
}

function calculateCallCost(durationSec: number) {
  const defaultRatePerMinute = 0.02;
  const minutes = durationSec / 60;
  return Math.round(minutes * defaultRatePerMinute * 100) / 100;
}
