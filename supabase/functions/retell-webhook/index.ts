
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateRetellAuth, validateWebhookSecurity } from "../_shared/retellAuth.ts";
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

  console.log(`[RETELL-WEBHOOK] ${new Date().toISOString()} - ${req.method} request received`);
  
  const processingStartTime = Date.now();

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Validate webhook security
    const securityError = validateWebhookSecurity(req);
    if (securityError) return securityError;

    // Validate Retell authentication
    const authError = validateRetellAuth(req, retellSecret);
    if (authError) return authError;

    // Parse webhook payload
    const { payload, error: payloadError } = await parseWebhookPayload(req);
    if (payloadError) return payloadError;

    // Validate payload structure
    const structureError = validatePayloadStructure(payload);
    if (structureError) return structureError;

    const { event, call } = payload;
    const retellCallId = call.call_id;
    const retellAgentId = call.agent_id;

    console.log(`[RETELL-WEBHOOK] Processing ${event} for call ${retellCallId} with agent ${retellAgentId}`);

    // Initialize Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Find agent in database
    const { agent, error: agentError } = await findAgentInDatabase(supabaseClient, retellAgentId);
    if (agentError) return agentError;

    // Find user agent mapping
    const { userAgent, error: userError } = await findUserAgentMapping(supabaseClient, agent.id);
    if (userError) return userError;

    // Create Retell call data
    const retellCallData = createRetellCallData(call);

    // Map to Supabase format
    const sanitizedCallData = mapRetellCallToSupabase(
      retellCallData,
      userAgent.user_id,
      userAgent.company_id,
      agent.id
    );

    // Process event-specific data
    const finalCallData = processWebhookEvent(event, sanitizedCallData);

    // Upsert call data
    const { upsertedCall, error: upsertError } = await upsertCallData(supabaseClient, finalCallData);
    if (upsertError) return upsertError;

    // Handle transactions and balance updates for completed calls
    await handleTransactionAndBalance(supabaseClient, event, finalCallData, userAgent);

    // Log successful webhook processing
    await logWebhookResult(
      supabaseClient,
      event,
      retellCallId,
      agent,
      userAgent,
      finalCallData,
      'success',
      processingStartTime
    );

    console.log(`[RETELL-WEBHOOK] Successfully processed ${event} for call ${retellCallId}`);

    return createSuccessResponse({
      message: 'Webhook processed successfully',
      event,
      callId: retellCallId,
      dbCallId: upsertedCall?.id,
      processingTimeMs: Date.now() - processingStartTime
    });

  } catch (error) {
    console.error('[RETELL-WEBHOOK] Fatal error:', error);
    
    // Log error to database
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
      console.error('Failed to log fatal error:', logError);
    }

    return createErrorResponse(`Webhook processing failed: ${error.message}`, 500);
  }
});
