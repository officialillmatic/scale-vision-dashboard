
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateRetellAuth, validateWebhookSecurity, logAuthAttempt } from "../_shared/retellAuth.ts";
import { parseWebhookPayload, validatePayloadStructure, createRetellCallData } from "../_shared/retellPayloadProcessor.ts";
import { findAgentInDatabase, findUserAgentMapping, upsertCallData } from "../_shared/retellDatabaseOps.ts";
import { processWebhookEvent, handleTransactionAndBalance, logWebhookResult } from "../_shared/retellEventProcessor.ts";
import { mapRetellCallToSupabase } from "../_shared/retellDataMapper.ts";

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

  const requestStartTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[RETELL-WEBHOOK-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);
  console.log(`[RETELL-WEBHOOK-${requestId}] Request URL: ${req.url}`);

  try {
    if (req.method !== 'POST') {
      console.error(`[RETELL-WEBHOOK-${requestId}] Invalid method: ${req.method}`);
      return createErrorResponse('Method not allowed - only POST requests accepted', 405);
    }

    // Step 1: Validate webhook security (basic checks)
    console.log(`[RETELL-WEBHOOK-${requestId}] Validating webhook security...`);
    const securityError = validateWebhookSecurity(req);
    if (securityError) {
      logAuthAttempt(req, false, 'Security validation failed');
      return securityError;
    }

    // Step 2: Validate Retell authentication
    console.log(`[RETELL-WEBHOOK-${requestId}] Validating Retell authentication...`);
    const authError = validateRetellAuth(req, retellSecret);
    if (authError) {
      logAuthAttempt(req, false, 'Authentication failed');
      return authError;
    }
    
    logAuthAttempt(req, true, 'Authentication successful');

    // Step 3: Parse webhook payload
    console.log(`[RETELL-WEBHOOK-${requestId}] Parsing webhook payload...`);
    const { payload, error: payloadError } = await parseWebhookPayload(req);
    if (payloadError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Payload parsing failed`);
      return payloadError;
    }

    // Step 4: Validate payload structure
    console.log(`[RETELL-WEBHOOK-${requestId}] Validating payload structure...`);
    const structureError = validatePayloadStructure(payload);
    if (structureError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Payload structure validation failed`);
      return structureError;
    }

    const { event, call } = payload;
    const retellCallId = call.call_id;
    const retellAgentId = call.agent_id;

    console.log(`[RETELL-WEBHOOK-${requestId}] Processing ${event} for call ${retellCallId} with agent ${retellAgentId}`);

    // Step 5: Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Step 6: Find agent in database
    console.log(`[RETELL-WEBHOOK-${requestId}] Finding agent in database...`);
    const { agent, error: agentError } = await findAgentInDatabase(supabaseClient, retellAgentId);
    if (agentError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Agent lookup failed for ${retellAgentId}`);
      return agentError;
    }

    // Step 7: Find user agent mapping
    console.log(`[RETELL-WEBHOOK-${requestId}] Finding user agent mapping...`);
    const { userAgent, error: userError } = await findUserAgentMapping(supabaseClient, agent.id);
    if (userError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] User mapping lookup failed for agent ${agent.id}`);
      return userError;
    }

    // Step 8: Create Retell call data
    console.log(`[RETELL-WEBHOOK-${requestId}] Creating call data...`);
    const retellCallData = createRetellCallData(call);

    // Step 9: Map to Supabase format
    const sanitizedCallData = mapRetellCallToSupabase(
      retellCallData,
      userAgent.user_id,
      userAgent.company_id,
      agent.id
    );

    // Step 10: Process event-specific data
    const finalCallData = processWebhookEvent(event, sanitizedCallData);

    // Step 11: Upsert call data
    console.log(`[RETELL-WEBHOOK-${requestId}] Upserting call data...`);
    const { upsertedCall, error: upsertError } = await upsertCallData(supabaseClient, finalCallData);
    if (upsertError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Call data upsert failed`);
      return upsertError;
    }

    // Step 12: Handle transactions and balance updates for completed calls
    if (event === 'call_ended') {
      console.log(`[RETELL-WEBHOOK-${requestId}] Processing call completion...`);
      await handleTransactionAndBalance(supabaseClient, event, finalCallData, userAgent);
    }

    // Step 13: Log successful webhook processing
    const processingTime = Date.now() - requestStartTime;
    await logWebhookResult(
      supabaseClient,
      event,
      retellCallId,
      agent,
      userAgent,
      finalCallData,
      'success',
      requestStartTime
    );

    console.log(`[RETELL-WEBHOOK-${requestId}] ✅ Successfully processed ${event} for call ${retellCallId} in ${processingTime}ms`);

    return createSuccessResponse({
      message: 'Webhook processed successfully',
      event,
      callId: retellCallId,
      dbCallId: upsertedCall?.id,
      processingTimeMs: processingTime,
      requestId
    });

  } catch (error) {
    const processingTime = Date.now() - requestStartTime;
    console.error(`[RETELL-WEBHOOK-${requestId}] ❌ Fatal error after ${processingTime}ms:`, error);
    
    // Log error to database with request context
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseClient
        .from('webhook_errors')
        .insert({
          error_type: 'fatal_error',
          error_details: error.message,
          stack_trace: error.stack,
          call_data: { 
            request_id: requestId,
            processing_time_ms: processingTime,
            request_method: req.method,
            request_url: req.url 
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error(`[RETELL-WEBHOOK-${requestId}] Failed to log fatal error:`, logError);
    }

    return createErrorResponse(`Webhook processing failed: ${error.message}`, 500);
  }
});
