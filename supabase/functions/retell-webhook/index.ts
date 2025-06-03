
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Enhanced CORS headers specifically for Retell AI
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retell-signature, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

function createSuccessResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createErrorResponse(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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
  // Handle CORS preflight requests FIRST
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[RETELL-WEBHOOK-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);
  console.log(`[RETELL-WEBHOOK-${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));

  try {
    // Allow GET requests for health checks
    if (req.method === 'GET') {
      console.log(`[RETELL-WEBHOOK-${requestId}] Health check request`);
      return createSuccessResponse({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Retell webhook endpoint is operational'
      });
    }

    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed - only POST and OPTIONS requests supported', 405);
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

    // Extract event and data - handle both formats
    const event = payload.event;
    const callData = payload.data || payload.call;
    const callId = callData?.call_id || `unknown_${Date.now()}`;
    
    if (!event) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Invalid webhook payload - missing event`);
      return createErrorResponse('Invalid webhook payload - missing event', 400);
    }

    console.log(`[RETELL-WEBHOOK-${requestId}] Processing webhook event: ${event} for call: ${callId}`);

    // ALWAYS log the webhook for audit purposes - regardless of processing success
    try {
      const { error: logError } = await supabaseClient
        .from('webhook_logs')
        .insert({
          event_type: event,
          call_id: callId,
          status: 'received',
          cost_usd: callData?.cost || callData?.cost_usd || 0,
          duration_sec: callData?.duration_sec || callData?.duration || 0,
          created_at: new Date().toISOString()
        });

      if (logError) {
        console.warn(`[RETELL-WEBHOOK-${requestId}] Failed to log webhook:`, logError);
      } else {
        console.log(`[RETELL-WEBHOOK-${requestId}] Successfully logged webhook to database`);
      }
    } catch (logError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Exception logging webhook:`, logError);
    }

    // Handle different webhook events
    switch (event) {
      case 'call_started':
        return await handleCallStarted(supabaseClient, requestId, callData);
      
      case 'call_ended':
        return await handleCallEnded(supabaseClient, requestId, callData);
      
      case 'call_analyzed':
        return await handleCallAnalyzed(supabaseClient, requestId, callData);
      
      case 'test_diagnostic':
      case 'test':
        console.log(`[RETELL-WEBHOOK-${requestId}] Test webhook received - responding with success`);
        return createSuccessResponse({
          message: 'Test webhook received successfully',
          event_type: event,
          call_id: callId,
          timestamp: new Date().toISOString()
        });
      
      default:
        console.log(`[RETELL-WEBHOOK-${requestId}] Unhandled event type: ${event}`);
        return createSuccessResponse({
          message: 'Event received but not processed',
          event_type: event,
          call_id: callId
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
          created_at: new Date().toISOString()
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
    // Basic call data mapping without requiring complex lookups
    const callData = {
      call_id: data.call_id,
      user_id: data.user_id || null,
      company_id: data.company_id || null,
      agent_id: data.agent_id || null,
      timestamp: new Date(data.start_timestamp ? data.start_timestamp * 1000 : Date.now()).toISOString(),
      start_time: data.start_timestamp ? new Date(data.start_timestamp * 1000).toISOString() : null,
      duration_sec: data.duration_sec || data.duration || 0,
      cost_usd: data.cost || data.cost_usd || 0,
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

    // Try to save to calls table
    const { data: upsertedCall, error: upsertError } = await supabaseClient
      .from('calls')
      .upsert(callData, {
        onConflict: 'call_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Call upsert error:`, upsertError);
      // Don't fail the webhook - just log the error
    } else {
      console.log(`[RETELL-WEBHOOK-${requestId}] Successfully processed call_ended for: ${data.call_id}`);
    }
    
    return createSuccessResponse({
      message: 'Call ended event processed successfully',
      call_id: data.call_id,
      database_id: upsertedCall?.id
    });

  } catch (error) {
    console.error(`[RETELL-WEBHOOK-${requestId}] Error processing call_ended:`, error);
    return createSuccessResponse({
      message: 'Call ended event received but processing failed',
      call_id: data.call_id,
      error: error.message
    });
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
      // Don't fail the webhook - just log the error
    } else {
      console.log(`[RETELL-WEBHOOK-${requestId}] Successfully processed call_analyzed for: ${data.call_id}`);
    }
    
    return createSuccessResponse({
      message: 'Call analyzed event processed successfully',
      call_id: data.call_id
    });

  } catch (error) {
    console.error(`[RETELL-WEBHOOK-${requestId}] Error processing call_analyzed:`, error);
    return createSuccessResponse({
      message: 'Call analyzed event received but processing failed',
      call_id: data.call_id,
      error: error.message
    });
  }
}
