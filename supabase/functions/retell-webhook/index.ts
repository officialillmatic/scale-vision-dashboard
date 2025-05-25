
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { mapRetellCallToDatabase, validateCallData, type RetellCallData } from "../_shared/retellDataMapper.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK] Received ${req.method} request to retell-webhook`);

  if (req.method !== 'POST') {
    console.log(`[WEBHOOK ERROR] Invalid method: ${req.method}`);
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook payload with detailed logging
    let payload;
    try {
      payload = await req.json();
      console.log('[WEBHOOK] Received payload keys:', Object.keys(payload));
    } catch (parseError) {
      console.error('[WEBHOOK ERROR] Failed to parse JSON payload:', parseError);
      return createErrorResponse('Invalid JSON payload', 400);
    }

    const { event, call } = payload;
    
    if (!event || !call) {
      console.error('[WEBHOOK ERROR] Invalid webhook payload: missing event or call data');
      console.log('[WEBHOOK DEBUG] Payload structure:', { hasEvent: !!event, hasCall: !!call });
      return createErrorResponse('Invalid webhook payload: missing event or call data', 400);
    }

    console.log(`[WEBHOOK] Processing event: ${event} for call: ${call.call_id || 'unknown'}`);

    // Enhanced validation for required fields
    if (!call.call_id) {
      console.error('[WEBHOOK ERROR] Missing required field: call_id');
      return createErrorResponse('Missing required field: call_id', 400);
    }

    if (!call.agent_id) {
      console.error('[WEBHOOK ERROR] Missing required field: agent_id');
      return createErrorResponse('Missing required field: agent_id', 400);
    }

    const retellCall: RetellCallData = {
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

    console.log(`[WEBHOOK] Looking up agent with retell_agent_id: ${retellCall.agent_id}`);

    // Find the agent in our database using retell_agent_id
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, name, rate_per_minute')
      .eq('retell_agent_id', retellCall.agent_id)
      .single();

    if (agentError || !agent) {
      console.error('[WEBHOOK ERROR] Agent not found:', { retell_agent_id: retellCall.agent_id, error: agentError });
      return createErrorResponse(`Agent not found for retell_agent_id: ${retellCall.agent_id}`, 400);
    }

    console.log(`[WEBHOOK] Found agent:`, { id: agent.id, name: agent.name });

    // Find user associated with this agent
    const { data: userAgent, error: userAgentError } = await supabaseClient
      .from('user_agents')
      .select('user_id, company_id')
      .eq('agent_id', agent.id)
      .single();

    if (userAgentError || !userAgent) {
      console.error('[WEBHOOK ERROR] User agent mapping not found:', { 
        agent_id: agent.id, 
        error: userAgentError 
      });
      return createErrorResponse(`User mapping not found for agent: ${agent.id}`, 400);
    }

    console.log(`[WEBHOOK] Found user mapping:`, { 
      user_id: userAgent.user_id, 
      company_id: userAgent.company_id 
    });

    // Map Retell call data to our schema with enhanced validation
    const mappedCallData = mapRetellCallToDatabase(
      retellCall,
      userAgent.user_id,
      userAgent.company_id,
      agent.id,
      agent.rate_per_minute || 0.02
    );

    // Validate the mapped data
    const validationErrors = validateCallData(mappedCallData);
    if (validationErrors.length > 0) {
      console.error('[WEBHOOK ERROR] Call data validation failed:', validationErrors);
      return createErrorResponse(`Invalid call data: ${validationErrors.join(', ')}`, 400);
    }

    console.log(`[WEBHOOK] Mapped call data successfully for call: ${retellCall.call_id}`);

    // Handle different webhook events with improved logic
    let finalCallData = { ...mappedCallData };
    
    switch (event) {
      case 'call_started':
        finalCallData = {
          ...finalCallData,
          duration_sec: 0,
          cost_usd: 0,
          call_status: 'in_progress',
          sentiment: 'neutral',
          sentiment_score: null,
          disconnection_reason: null,
          recording_url: null,
          transcript: null,
          transcript_url: null,
          disposition: null
        };
        console.log(`[WEBHOOK] Processing call_started event for call: ${retellCall.call_id}`);
        break;

      case 'call_ended':
      case 'call_analyzed':
        // Use the fully mapped data with all available fields
        console.log(`[WEBHOOK] Processing ${event} event for call: ${retellCall.call_id}`);
        break;

      default:
        console.log(`[WEBHOOK] Unknown event type: ${event}, returning success anyway`);
        return createSuccessResponse({ 
          message: 'Event received but not processed', 
          event,
          call_id: retellCall.call_id,
          status: 'acknowledged'
        });
    }

    // Upsert the call data with improved conflict handling
    const { data: upsertedCall, error: upsertError } = await supabaseClient
      .from('calls')
      .upsert(finalCallData, {
        onConflict: 'call_id',
        ignoreDuplicates: false
      })
      .select('id')
      .single();

    if (upsertError) {
      console.error('[WEBHOOK ERROR] Failed to upsert call data:', upsertError);
      return createErrorResponse(`Failed to save call data: ${upsertError.message}`, 500);
    }

    console.log(`[WEBHOOK] Successfully upserted call with ID: ${upsertedCall?.id}`);

    // Create transaction record for cost tracking (only for completed calls)
    if ((event === 'call_ended' || event === 'call_analyzed') && finalCallData.cost_usd > 0) {
      console.log(`[WEBHOOK] Creating transaction record for cost: ${finalCallData.cost_usd}`);
      
      const { error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          amount: -finalCallData.cost_usd, // Negative for debit
          transaction_type: 'call_cost',
          description: `Call cost for ${finalCallData.call_id}`,
          call_id: finalCallData.call_id
        });

      if (transactionError) {
        console.error('[WEBHOOK ERROR] Failed to create transaction:', transactionError);
        // Don't fail the webhook for transaction errors, just log it
      } else {
        console.log(`[WEBHOOK] Successfully created transaction record`);
      }

      // Update user balance using the new safe function
      const { error: balanceError } = await supabaseClient.rpc('update_user_balance', {
        p_user_id: userAgent.user_id,
        p_company_id: userAgent.company_id,
        p_amount: -finalCallData.cost_usd
      });

      if (balanceError) {
        console.error('[WEBHOOK ERROR] Failed to update user balance:', balanceError);
        // Don't fail the webhook for balance errors, just log it
      } else {
        console.log(`[WEBHOOK] Successfully updated user balance`);
      }
    }
    
    console.log(`[WEBHOOK SUCCESS] Successfully processed ${event} webhook for call ${retellCall.call_id}`);
    
    return createSuccessResponse({
      message: `Webhook ${event} processed successfully`,
      call_id: retellCall.call_id,
      event,
      agent_id: agent.id,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      cost_usd: finalCallData.cost_usd,
      status: 'success'
    });

  } catch (error) {
    console.error('[WEBHOOK FATAL ERROR] Webhook processing error:', error);
    console.error('[WEBHOOK FATAL ERROR] Stack trace:', error.stack);
    return createErrorResponse(`Internal server error: ${error.message}`, 500);
  }
});
