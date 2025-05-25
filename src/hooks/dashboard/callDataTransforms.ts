
import { CallData } from "@/services/callService";

export const transformCallData = (call: any): CallData => ({
  id: call.id,
  call_id: call.call_id,
  timestamp: new Date(call.timestamp),
  duration_sec: call.duration_sec,
  cost_usd: call.cost_usd,
  sentiment: call.sentiment || "neutral",
  sentiment_score: call.sentiment_score,
  disconnection_reason: call.disconnection_reason,
  call_status: call.call_status,
  from: call.from || call.from_number || 'unknown',
  to: call.to || call.to_number || 'unknown',
  from_number: call.from_number || call.from || 'unknown',
  to_number: call.to_number || call.to || 'unknown',
  audio_url: call.audio_url || call.recording_url,
  recording_url: call.recording_url || call.audio_url,
  transcript: call.transcript,
  transcript_url: call.transcript_url,
  user_id: call.user_id,
  result_sentiment: call.result_sentiment,
  company_id: call.company_id,
  call_type: call.call_type || 'phone_call',
  latency_ms: call.latency_ms || 0,
  call_summary: call.call_summary,
  start_time: new Date(call.start_time || call.timestamp),
  disposition: call.disposition,
  agent: call.agent
});
