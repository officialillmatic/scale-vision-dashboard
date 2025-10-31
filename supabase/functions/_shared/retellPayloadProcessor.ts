
import { createErrorResponse } from './corsUtils.ts';
import { type RetellCallData } from './retellDataMapper.ts';

export async function parseWebhookPayload(req: Request): Promise<{ payload: any; error?: Response }> {
  try {
    const rawPayload = await req.text();
    console.log(`[WEBHOOK] Raw payload length: ${rawPayload.length}`);
    console.log(`[WEBHOOK] Raw payload preview: ${rawPayload.substring(0, 200)}...`);
    
    const payload = JSON.parse(rawPayload);
    console.log('[WEBHOOK] Received payload keys:', Object.keys(payload));
    console.log('[WEBHOOK] Event type:', payload.event);
    console.log('[WEBHOOK] Call ID:', payload.call?.call_id);
    
    return { payload };
  } catch (parseError) {
    console.error('[WEBHOOK ERROR] Failed to parse JSON payload:', parseError);
    return { 
      payload: null, 
      error: createErrorResponse('Invalid JSON payload', 400) 
    };
  }
}

export function validatePayloadStructure(payload: any): Response | null {
  const { event, call } = payload;
  
  // Enhanced payload validation
  if (!event || !call) {
    console.error('[WEBHOOK ERROR] Invalid webhook payload: missing event or call data');
    return createErrorResponse('Invalid webhook payload: missing event or call data', 400);
  }

  // Validate event types
  const validEvents = ['call_started', 'call_ended', 'call_analyzed', 'call_disconnected'];
  if (!validEvents.includes(event)) {
    console.warn(`[WEBHOOK WARNING] Unknown event type: ${event}, processing anyway`);
  }

  console.log(`[WEBHOOK] Processing event: ${event} for call: ${call.call_id}`);

  // Enhanced validation for required fields
  const requiredFields = ['call_id', 'agent_id'];
  for (const field of requiredFields) {
    if (!call[field]) {
      console.error(`[WEBHOOK ERROR] Missing required field: ${field}`);
      return createErrorResponse(`Missing required field: ${field}`, 400);
    }
  }

  return null;
}

export function createRetellCallData(call: any): RetellCallData {
  return {
    call_id: call.call_id,
    agent_id: call.agent_id,
    from_number: call.from_number || 'unknown',
    to_number: call.to_number || 'unknown',
    start_timestamp: call.start_timestamp,
    end_timestamp: call.end_timestamp,
    duration: call.duration,
    duration_ms: call.duration_ms,
    disconnection_reason: call.disconnection_reason,
    call_status: call.call_status || 'unknown',
    recording_url: call.recording_url,
    transcript: call.transcript,
    transcript_url: call.transcript_url,
    sentiment_score: call.sentiment_score,
    sentiment: call.sentiment,
    disposition: call.disposition,
    latency_ms: call.latency_ms
  };
}
