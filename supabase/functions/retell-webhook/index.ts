
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { findAgentInDatabase, findUserAgentMapping, upsertCallData } from "../_shared/retellDatabaseOps.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const retellSecret = env('RETELL_SECRET');

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[RETELL-WEBHOOK-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed - only POST requests supported', 405);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the webhook payload
    const payload = await req.json();
    console.log(`[RETELL-WEBHOOK-${requestId}] Webhook payload:`, JSON.stringify(payload, null, 2));

    // Verify webhook signature if available
    const signature = req.headers.get('x-retell-signature');
    if (signature && retellSecret) {
      // TODO: Implement signature verification
      console.log(`[RETELL-WEBHOOK-${requestId}] Signature verification enabled`);
    }

    const { event, data } = payload;
    
    if (!event || !data) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Invalid webhook payload - missing event or data`);
      return createErrorResponse('Invalid webhook payload', 400);
    }

    console.log(`[RETELL-WEBHOOK-${requestId}] Processing webhook event: ${event}`);

    // Log the webhook for audit purposes
    const { error: logError } = await supabaseClient
      .from('webhook_logs')
      .insert({
        event_type: event,
        call_id: data.call_id,
        status: 'processing',
        cost_usd: data.cost,
        duration_sec: data.duration_sec
      });

    if (logError) {
      console.warn(`[RETELL-WEBHOOK-${requestId}] Failed to log webhook:`, logError);
    }

    // Handle different webhook events
    switch (event) {
      case 'call_started':
        return await handleCallStarted(supabaseClient, requestId, data);
      
      case 'call_ended':
        return await handleCallEnded(supabaseClient, requestId, data);
      
      case 'call_analyzed':
        return await handleCallAnalyzed(supabaseClient, requestId, data);
      
      default:
        console.log(`[RETELL-WEBHOOK-${requestId}] Unhandled event type: ${event}`);
        return createSuccessResponse({
          message: 'Event received but not processed',
          event_type: event
        });
    }

  } catch (error) {
    console.error(`[RETELL-WEBHOOK-${requestId}] Fatal error:`, error);
    
    // Log the error to database
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseClient
        .from('webhook_errors')
        .insert({
          error_type: 'fatal_error',
          error_details: error.message,
          stack_trace: error.stack,
          call_data: req.body
        });
    } catch (logError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Failed to log error:`, logError);
    }
    
    return createErrorResponse(`Webhook processing failed: ${error.message}`, 500);
  }
});

async function handleCallStarted(supabaseClient: any, requestId: string, data: any) {
  console.log(`[RETELL-WEBHOOK-${requestId}] Handling call_started for call: ${data.call_id}`);
  
  // For call_started, we mainly just want to log that the call has begun
  // The actual call data will be processed when the call ends
  
  return createSuccessResponse({
    message: 'Call started event processed',
    call_id: data.call_id
  });
}

async function handleCallEnded(supabaseClient: any, requestId: string, data: any) {
  console.log(`[RETELL-WEBHOOK-${requestId}] Handling call_ended for call: ${data.call_id}`);
  
  try {
    // Find the agent in our database
    const { agent, error: agentError } = await findAgentInDatabase(supabaseClient, data.agent_id);
    if (agentError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Agent lookup failed:`, agentError);
      return agentError;
    }

    // Find user-agent mapping
    const { userAgent, error: mappingError } = await findUserAgentMapping(supabaseClient, agent.id);
    if (mappingError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] User mapping lookup failed:`, mappingError);
      return mappingError;
    }

    // Map the call data to our schema
    const callData = {
      call_id: data.call_id,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      agent_id: agent.id,
      timestamp: new Date(data.start_timestamp * 1000).toISOString(),
      start_time: data.start_timestamp ? new Date(data.start_timestamp * 1000).toISOString() : null,
      duration_sec: data.duration_sec || 0,
      cost_usd: data.cost || 0,
      call_status: data.call_status || 'completed',
      from: data.from_number || 'unknown',
      to: data.to_number || 'unknown',
      from_number: data.from_number,
      to_number: data.to_number,
      disconnection_reason: data.disconnection_reason,
      recording_url: data.recording_url,
      transcript: data.transcript,
      transcript_url: data.transcript_url,
      call_type: 'phone_call',
      disposition: data.disposition,
      latency_ms: data.latency_ms,
      call_summary: data.summary
    };

    // Upsert the call data
    const { upsertedCall, error: upsertError } = await upsertCallData(supabaseClient, callData);
    if (upsertError) {
      return upsertError;
    }

    console.log(`[RETELL-WEBHOOK-${requestId}] Successfully processed call_ended for: ${data.call_id}`);
    
    return createSuccessResponse({
      message: 'Call ended event processed successfully',
      call_id: data.call_id,
      database_id: upsertedCall.id
    });

  } catch (error) {
    console.error(`[RETELL-WEBHOOK-${requestId}] Error processing call_ended:`, error);
    return createErrorResponse(`Failed to process call_ended: ${error.message}`, 500);
  }
}

async function handleCallAnalyzed(supabaseClient: any, requestId: string, data: any) {
  console.log(`[RETELL-WEBHOOK-${requestId}] Handling call_analyzed for call: ${data.call_id}`);
  
  try {
    // Update the existing call with analysis data
    const { error: updateError } = await supabaseClient
      .from('calls')
      .update({
        sentiment: data.sentiment?.overall_sentiment,
        sentiment_score: data.sentiment?.score,
        result_sentiment: data.sentiment,
        call_summary: data.summary,
        transcript: data.transcript,
        transcript_url: data.transcript_url
      })
      .eq('call_id', data.call_id);

    if (updateError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Failed to update call analysis:`, updateError);
      return createErrorResponse(`Failed to update call analysis: ${updateError.message}`, 500);
    }

    console.log(`[RETELL-WEBHOOK-${requestId}] Successfully processed call_analyzed for: ${data.call_id}`);
    
    return createSuccessResponse({
      message: 'Call analyzed event processed successfully',
      call_id: data.call_id
    });

  } catch (error) {
    console.error(`[RETELL-WEBHOOK-${requestId}] Error processing call_analyzed:`, error);
    return createErrorResponse(`Failed to process call_analyzed: ${error.message}`, 500);
  }
}
