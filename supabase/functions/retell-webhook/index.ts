
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { mapRetellCallToDatabase, validateCallData, sanitizeCallData } from "../_shared/retellDataMapper.ts";
import { validateRetellAuth, validateWebhookSecurity } from "../_shared/retellAuth.ts";
import { parseWebhookPayload, validatePayloadStructure, createRetellCallData } from "../_shared/retellPayloadProcessor.ts";
import { findAgentInDatabase, findUserAgentMapping, upsertCallData } from "../_shared/retellDatabaseOps.ts";
import { processWebhookEvent, handleTransactionAndBalance, logWebhookResult } from "../_shared/retellEventProcessor.ts";

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

  console.log(`[WEBHOOK] ${new Date().toISOString()} - Received ${req.method} request`);
  console.log(`[WEBHOOK] Headers:`, Object.fromEntries(req.headers.entries()));

  // Add a simple GET endpoint for health checks and secret validation
  if (req.method === 'GET') {
    console.log('[WEBHOOK] Health check requested');
    
    if (!retellSecret) {
      return createErrorResponse('RETELL_SECRET not configured', 500);
    }
    
    return new Response("ok", {
      headers: { ...corsHeaders, "Content-Profile": "public" },
    });
  }

  if (req.method !== 'POST') {
    console.log(`[WEBHOOK ERROR] Invalid method: ${req.method}`);
    return createErrorResponse('Method not allowed', 405);
  }

  const processingStartTime = Date.now();

  try {
    // Validate authentication
    const authError = validateRetellAuth(req, retellSecret);
    if (authError) return authError;

    // Validate webhook security
    const securityError = validateWebhookSecurity(req);
    if (securityError) return securityError;

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook payload
    const { payload, error: parseError } = await parseWebhookPayload(req);
    if (parseError) return parseError;

    // Validate payload structure
    const structureError = validatePayloadStructure(payload);
    if (structureError) return structureError;

    const { event, call } = payload;
    const retellCall = createRetellCallData(call);

    // Find agent in database
    const { agent, error: agentError } = await findAgentInDatabase(supabaseClient, retellCall.agent_id);
    if (agentError) return agentError;

    // Find user agent mapping
    const { userAgent, error: userAgentError } = await findUserAgentMapping(supabaseClient, agent.id);
    if (userAgentError) return userAgentError;

    // Map and validate call data
    const mappedCallData = mapRetellCallToDatabase(
      retellCall,
      userAgent.user_id,
      userAgent.company_id,
      agent.id,
      agent.rate_per_minute || 0.02
    );

    const validationErrors = validateCallData(mappedCallData);
    if (validationErrors.length > 0) {
      console.error('[WEBHOOK ERROR] Call data validation failed:', validationErrors);
      return createErrorResponse(`Invalid call data: ${validationErrors.join(', ')}`, 400);
    }

    // Sanitize and process event data
    const sanitizedCallData = sanitizeCallData(mappedCallData);
    const finalCallData = processWebhookEvent(event, sanitizedCallData);

    console.log(`[WEBHOOK] Mapped and sanitized call data successfully for call: ${retellCall.call_id}`);

    // Upsert call data
    const { upsertedCall, error: upsertError } = await upsertCallData(supabaseClient, finalCallData);
    if (upsertError) return upsertError;

    // Handle transaction and balance updates
    await handleTransactionAndBalance(supabaseClient, event, finalCallData, userAgent);

    // Log webhook success
    await logWebhookResult(
      supabaseClient,
      event,
      retellCall.call_id,
      agent,
      userAgent,
      finalCallData,
      'success',
      processingStartTime
    );
    
    const response = {
      message: `Webhook ${event} processed successfully`,
      call_id: retellCall.call_id,
      event,
      agent_id: agent.id,
      agent_name: agent.name,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      company_name: userAgent.companies?.name,
      cost_usd: finalCallData.cost_usd,
      duration_sec: finalCallData.duration_sec,
      status: 'success',
      timestamp: new Date().toISOString()
    };

    console.log(`[WEBHOOK SUCCESS] ${JSON.stringify(response)}`);
    
    return createSuccessResponse(response);

  } catch (error) {
    console.error('[WEBHOOK FATAL ERROR] Webhook processing error:', error);
    console.error('[WEBHOOK FATAL ERROR] Stack trace:', error.stack);
    
    // Log critical errors for monitoring
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
      console.error('[WEBHOOK] Failed to log fatal error:', logError);
    }
    
    return createErrorResponse(`Internal server error: ${error.message}`, 500);
  }
});
