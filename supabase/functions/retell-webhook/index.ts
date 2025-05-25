
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

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
      console.log('[WEBHOOK] Received payload:', JSON.stringify(payload, null, 2));
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

    const {
      call_id,
      agent_id: retell_agent_id,
      from_number,
      to_number,
      start_timestamp,
      end_timestamp,
      duration,
      disconnection_reason,
      call_status,
      recording_url,
      transcript,
      transcript_url,
      sentiment_score,
      sentiment,
      disposition,
      latency_ms
    } = call;

    if (!call_id || !retell_agent_id) {
      console.error('[WEBHOOK ERROR] Missing required fields:', { 
        hasCallId: !!call_id, 
        hasAgentId: !!retell_agent_id 
      });
      return createErrorResponse('Missing required call data: call_id or agent_id', 400);
    }

    console.log(`[WEBHOOK] Looking up agent with retell_agent_id: ${retell_agent_id}`);

    // Find the agent in our database using retell_agent_id
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, name, rate_per_minute')
      .eq('retell_agent_id', retell_agent_id)
      .single();

    if (agentError || !agent) {
      console.error('[WEBHOOK ERROR] Agent not found:', { retell_agent_id, error: agentError });
      return createErrorResponse(`Agent not found for retell_agent_id: ${retell_agent_id}`, 400);
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

    // Calculate cost based on duration and agent rate
    const durationMinutes = duration ? duration / 60 : 0;
    const ratePerMinute = agent.rate_per_minute || 0.02;
    const cost = durationMinutes * ratePerMinute;

    console.log(`[WEBHOOK] Cost calculation:`, { 
      duration, 
      durationMinutes, 
      ratePerMinute, 
      cost 
    });

    // Prepare call data based on webhook event
    let callData: any = {
      call_id,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      agent_id: agent.id,
      from_number: from_number || 'unknown',
      to_number: to_number || 'unknown',
      from: from_number || 'unknown', // Backward compatibility
      to: to_number || 'unknown', // Backward compatibility
      call_type: 'phone_call',
      latency_ms: latency_ms || 0
    };

    // Handle different webhook events
    switch (event) {
      case 'call_started':
        callData = {
          ...callData,
          start_time: start_timestamp || new Date().toISOString(),
          timestamp: start_timestamp || new Date().toISOString(), // Backward compatibility
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
        console.log(`[WEBHOOK] Processing call_started event for call: ${call_id}`);
        break;

      case 'call_ended':
        callData = {
          ...callData,
          start_time: start_timestamp || new Date().toISOString(),
          timestamp: start_timestamp || new Date().toISOString(), // Backward compatibility
          duration_sec: duration || 0,
          cost_usd: cost,
          call_status: call_status || 'completed',
          disconnection_reason: disconnection_reason,
          sentiment: sentiment || 'neutral',
          sentiment_score: sentiment_score,
          recording_url: recording_url,
          transcript: transcript,
          transcript_url: transcript_url,
          disposition: disposition,
          audio_url: recording_url // Backward compatibility
        };
        console.log(`[WEBHOOK] Processing call_ended event for call: ${call_id}`);
        break;

      case 'call_analyzed':
        callData = {
          ...callData,
          start_time: start_timestamp || new Date().toISOString(),
          timestamp: start_timestamp || new Date().toISOString(), // Backward compatibility
          duration_sec: duration || 0,
          cost_usd: cost,
          call_status: call_status || 'completed',
          disconnection_reason: disconnection_reason,
          sentiment: sentiment || 'neutral',
          sentiment_score: sentiment_score,
          recording_url: recording_url,
          transcript: transcript,
          transcript_url: transcript_url,
          disposition: disposition,
          audio_url: recording_url // Backward compatibility
        };
        console.log(`[WEBHOOK] Processing call_analyzed event for call: ${call_id}`);
        break;

      default:
        console.log(`[WEBHOOK] Unknown event type: ${event}, returning success anyway`);
        return createSuccessResponse({ 
          message: 'Event received but not processed', 
          event,
          call_id,
          status: 'acknowledged'
        });
    }

    console.log(`[WEBHOOK] Upserting call data:`, JSON.stringify(callData, null, 2));

    // Upsert the call data
    const { data: upsertedCall, error: upsertError } = await supabaseClient
      .from('calls')
      .upsert(callData, {
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
    if ((event === 'call_ended' || event === 'call_analyzed') && cost > 0) {
      console.log(`[WEBHOOK] Creating transaction record for cost: ${cost}`);
      
      const { error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          amount: -cost, // Negative for debit
          transaction_type: 'call_cost',
          description: `Call cost for ${call_id}`,
          call_id: call_id // Reference the call_id string instead of the database ID
        });

      if (transactionError) {
        console.error('[WEBHOOK ERROR] Failed to create transaction:', transactionError);
        // Don't fail the webhook for transaction errors, just log it
      } else {
        console.log(`[WEBHOOK] Successfully created transaction record for cost: ${cost}`);
      }
    }
    
    console.log(`[WEBHOOK SUCCESS] Successfully processed ${event} webhook for call ${call_id}`);
    
    return createSuccessResponse({
      message: `Webhook ${event} processed successfully`,
      call_id,
      event,
      agent_id: agent.id,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      cost_usd: cost,
      status: 'success'
    });

  } catch (error) {
    console.error('[WEBHOOK FATAL ERROR] Webhook processing error:', error);
    console.error('[WEBHOOK FATAL ERROR] Stack trace:', error.stack);
    return createErrorResponse(`Internal server error: ${error.message}`, 500);
  }
});
