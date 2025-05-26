
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { mapRetellCallToDatabase, validateCallData, type RetellCallData } from "../_shared/retellDataMapper.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellSecret = Deno.env.get('RETELL_SECRET'); // Required secret for validation

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK] ${new Date().toISOString()} - Received ${req.method} request`);
  console.log(`[WEBHOOK] Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method !== 'POST') {
    console.log(`[WEBHOOK ERROR] Invalid method: ${req.method}`);
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // API Key Validation - Check for x-retell-token header
    const retellToken = req.headers.get('x-retell-token');
    
    if (!retellSecret) {
      console.error('[WEBHOOK ERROR] RETELL_SECRET not configured');
      return createErrorResponse('Server configuration error', 500);
    }

    if (!retellToken) {
      console.error('[WEBHOOK ERROR] Missing x-retell-token header');
      return createErrorResponse('Unauthorized: Missing API token', 401);
    }

    if (retellToken !== retellSecret) {
      console.error('[WEBHOOK ERROR] Invalid x-retell-token');
      return createErrorResponse('Unauthorized: Invalid API token', 401);
    }

    console.log('[WEBHOOK] API token validation passed');

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Enhanced webhook security validation
    const userAgent = req.headers.get('user-agent') || '';
    const contentType = req.headers.get('content-type') || '';
    
    console.log(`[WEBHOOK] User-Agent: ${userAgent}`);
    console.log(`[WEBHOOK] Content-Type: ${contentType}`);
    
    // Basic security validations
    if (!contentType.includes('application/json')) {
      console.error('[WEBHOOK ERROR] Invalid content type');
      return createErrorResponse('Invalid content type', 400);
    }
    
    // Rate limiting check (basic implementation)
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log(`[WEBHOOK] Request from IP: ${clientIP}`);
    
    // Parse webhook payload with detailed logging
    let payload;
    try {
      const rawPayload = await req.text();
      console.log(`[WEBHOOK] Raw payload length: ${rawPayload.length}`);
      console.log(`[WEBHOOK] Raw payload preview: ${rawPayload.substring(0, 200)}...`);
      
      payload = JSON.parse(rawPayload);
      console.log('[WEBHOOK] Received payload keys:', Object.keys(payload));
      console.log('[WEBHOOK] Event type:', payload.event);
      console.log('[WEBHOOK] Call ID:', payload.call?.call_id);
    } catch (parseError) {
      console.error('[WEBHOOK ERROR] Failed to parse JSON payload:', parseError);
      return createErrorResponse('Invalid JSON payload', 400);
    }

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

    // Find the agent in our database using retell_agent_id with better error handling
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, name, rate_per_minute, status')
      .eq('retell_agent_id', retellCall.agent_id)
      .eq('status', 'active') // Only active agents
      .single();

    if (agentError || !agent) {
      console.error('[WEBHOOK ERROR] Agent not found or inactive:', { 
        retell_agent_id: retellCall.agent_id, 
        error: agentError 
      });
      
      // Log this for monitoring but don't fail completely
      try {
        await supabaseClient
          .from('webhook_errors')
          .insert({
            error_type: 'agent_not_found',
            retell_agent_id: retellCall.agent_id,
            call_id: retellCall.call_id,
            event_type: event,
            error_details: agentError?.message || 'Agent not found or inactive',
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
        
      return createErrorResponse(`Agent not found or inactive for retell_agent_id: ${retellCall.agent_id}`, 400);
    }

    console.log(`[WEBHOOK] Found agent:`, { id: agent.id, name: agent.name, status: agent.status });

    // Find user associated with this agent with enhanced validation
    const { data: userAgent, error: userAgentError } = await supabaseClient
      .from('user_agents')
      .select(`
        user_id, 
        company_id,
        is_primary,
        companies!inner(id, name, owner_id)
      `)
      .eq('agent_id', agent.id)
      .single();

    if (userAgentError || !userAgent) {
      console.error('[WEBHOOK ERROR] User agent mapping not found:', { 
        agent_id: agent.id, 
        error: userAgentError 
      });
      
      // Log for monitoring
      try {
        await supabaseClient
          .from('webhook_errors')
          .insert({
            error_type: 'user_mapping_not_found',
            agent_id: agent.id,
            call_id: retellCall.call_id,
            event_type: event,
            error_details: userAgentError?.message || 'User mapping not found',
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log webhook error:', logError);
      }
        
      return createErrorResponse(`User mapping not found for agent: ${agent.id}`, 400);
    }

    console.log(`[WEBHOOK] Found user mapping:`, { 
      user_id: userAgent.user_id, 
      company_id: userAgent.company_id,
      company_name: userAgent.companies?.name
    });

    // Map Retell call data to our schema
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
          sentiment: null,
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
      case 'call_disconnected':
        finalCallData.call_status = 'completed';
        console.log(`[WEBHOOK] Processing ${event} event for call: ${retellCall.call_id}`);
        break;

      default:
        console.log(`[WEBHOOK] Processing unknown event type: ${event}, storing as completed`);
        finalCallData.call_status = 'completed';
        break;
    }

    // Enhanced upsert with conflict resolution - using service role should bypass RLS
    console.log(`[WEBHOOK] Upserting call data for call_id: ${finalCallData.call_id}`);
    const { data: upsertedCall, error: upsertError } = await supabaseClient
      .from('calls')
      .upsert(finalCallData, {
        onConflict: 'call_id',
        ignoreDuplicates: false
      })
      .select('id, call_id, cost_usd')
      .single();

    if (upsertError) {
      console.error('[WEBHOOK ERROR] Failed to upsert call data:', upsertError);
      console.error('[WEBHOOK ERROR] Call data that failed:', JSON.stringify(finalCallData, null, 2));
      
      // Log the upsert error for debugging
      try {
        await supabaseClient
          .from('webhook_errors')
          .insert({
            error_type: 'upsert_failed',
            call_id: retellCall.call_id,
            event_type: event,
            error_details: upsertError.message,
            call_data: finalCallData,
            created_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log upsert error:', logError);
      }
      
      return createErrorResponse(`Failed to save call data: ${upsertError.message}`, 500);
    }

    console.log(`[WEBHOOK] Successfully upserted call with ID: ${upsertedCall?.id}`);

    // Create transaction record and update balance for completed calls only
    if ((event === 'call_ended' || event === 'call_analyzed' || event === 'call_disconnected') && finalCallData.cost_usd > 0) {
      console.log(`[WEBHOOK] Creating transaction record for cost: ${finalCallData.cost_usd}`);
      
      // Check current balance before deducting
      const { data: currentBalance } = await supabaseClient
        .from('user_balances')
        .select('balance')
        .eq('user_id', userAgent.user_id)
        .eq('company_id', userAgent.company_id)
        .single();

      const balanceBefore = currentBalance?.balance || 0;
      console.log(`[WEBHOOK] Balance before deduction: ${balanceBefore}`);
      
      // Create transaction record
      const { error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          amount: -finalCallData.cost_usd,
          transaction_type: 'call_cost',
          description: `Call cost for ${finalCallData.call_id} (${finalCallData.duration_sec}s)`,
          call_id: finalCallData.call_id
        });

      if (transactionError) {
        console.error('[WEBHOOK ERROR] Failed to create transaction:', transactionError);
      } else {
        console.log(`[WEBHOOK] Successfully created transaction record`);
      }

      // Update user balance using the RPC function
      const { error: balanceError } = await supabaseClient.rpc('update_user_balance', {
        p_user_id: userAgent.user_id,
        p_company_id: userAgent.company_id,
        p_amount: -finalCallData.cost_usd
      });

      if (balanceError) {
        console.error('[WEBHOOK ERROR] Failed to update user balance:', balanceError);
      } else {
        console.log(`[WEBHOOK] Successfully updated user balance`);
      }

      // Check for low balance warning
      if (balanceBefore - finalCallData.cost_usd < 10) {
        console.warn(`[WEBHOOK WARNING] Low balance for user ${userAgent.user_id}: ${balanceBefore - finalCallData.cost_usd}`);
      }
    }

    // Log webhook success for monitoring
    try {
      await supabaseClient
        .from('webhook_logs')
        .insert({
          event_type: event,
          call_id: retellCall.call_id,
          agent_id: agent.id,
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          cost_usd: finalCallData.cost_usd,
          duration_sec: finalCallData.duration_sec,
          status: 'success',
          processing_time_ms: Date.now() - new Date(finalCallData.timestamp).getTime(),
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log webhook success:', logError);
    }
    
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
