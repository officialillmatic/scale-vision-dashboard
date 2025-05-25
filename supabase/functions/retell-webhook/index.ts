
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse webhook payload
    const payload = await req.json();
    console.log('Received Retell webhook:', JSON.stringify(payload, null, 2));

    const { event, call } = payload;
    
    if (!event || !call) {
      console.error('Invalid webhook payload: missing event or call data');
      return createErrorResponse('Invalid webhook payload', 400);
    }

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
      sentiment_score,
      sentiment,
      disposition
    } = call;

    if (!call_id || !retell_agent_id) {
      console.error('Missing required fields: call_id or agent_id');
      return createErrorResponse('Missing required call data', 400);
    }

    // Find the agent in our database using retell_agent_id
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('id, name, rate_per_minute')
      .eq('retell_agent_id', retell_agent_id)
      .single();

    if (agentError || !agent) {
      console.error('Agent not found for retell_agent_id:', retell_agent_id, agentError);
      return createErrorResponse(`Agent not found: ${retell_agent_id}`, 400);
    }

    // Find user associated with this agent
    const { data: userAgent, error: userAgentError } = await supabaseClient
      .from('user_agents')
      .select('user_id, company_id')
      .eq('agent_id', agent.id)
      .single();

    if (userAgentError || !userAgent) {
      console.error('User agent mapping not found for agent:', agent.id, userAgentError);
      return createErrorResponse(`User mapping not found for agent: ${agent.id}`, 400);
    }

    // Calculate cost based on duration and agent rate
    const durationMinutes = duration ? duration / 60 : 0;
    const ratePerMinute = agent.rate_per_minute || 0.02;
    const cost = durationMinutes * ratePerMinute;

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
      latency_ms: 0
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
          sentiment: 'neutral'
        };
        console.log('Processing call_started event for call:', call_id);
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
          audio_url: recording_url // Backward compatibility
        };
        console.log('Processing call_ended event for call:', call_id);
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
          audio_url: recording_url, // Backward compatibility
          transcript: transcript,
          disposition: disposition
        };
        console.log('Processing call_analyzed event for call:', call_id);
        break;

      default:
        console.log('Unknown webhook event:', event);
        return createSuccessResponse({ message: 'Event received but not processed', event });
    }

    // Upsert the call data
    const { error: upsertError } = await supabaseClient
      .from('calls')
      .upsert(callData, {
        onConflict: 'call_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting call data:', upsertError);
      return createErrorResponse('Failed to save call data', 500);
    }

    console.log(`Successfully processed ${event} webhook for call ${call_id}`);
    
    return createSuccessResponse({
      message: `Webhook ${event} processed successfully`,
      call_id,
      event,
      agent_id: agent.id,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
