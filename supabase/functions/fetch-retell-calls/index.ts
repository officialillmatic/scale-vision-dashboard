
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellApiKey = Deno.env.get('RETELL_API_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[FETCH-RETELL-CALLS] Received ${req.method} request`);

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (!retellApiKey) {
      console.error('[FETCH-RETELL-CALLS] RETELL_API_KEY not configured');
      return createErrorResponse('Retell API key not configured', 500);
    }

    // Parse request body for optional parameters
    let requestBody = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error('[FETCH-RETELL-CALLS] Error parsing request body:', parseError);
    }

    const { 
      agent_id: filterAgentId, 
      limit = 100, 
      after_timestamp,
      before_timestamp 
    } = requestBody as any;

    console.log(`[FETCH-RETELL-CALLS] Fetching calls with filters:`, {
      agent_id: filterAgentId,
      limit,
      after_timestamp,
      before_timestamp
    });

    // Build Retell API URL with query parameters
    const queryParams = new URLSearchParams();
    if (filterAgentId) queryParams.append('agent_id', filterAgentId);
    if (limit) queryParams.append('limit', limit.toString());
    if (after_timestamp) queryParams.append('after_timestamp', after_timestamp);
    if (before_timestamp) queryParams.append('before_timestamp', before_timestamp);

    const retellUrl = `https://api.retellai.com/v2/get-calls?${queryParams.toString()}`;

    // Fetch calls from Retell API
    const retellResponse = await fetch(retellUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error(`[FETCH-RETELL-CALLS] Retell API error:`, retellResponse.status, errorText);
      return createErrorResponse(`Retell API error: ${retellResponse.status}`, 500);
    }

    const retellData = await retellResponse.json();
    const calls = retellData.calls || [];

    console.log(`[FETCH-RETELL-CALLS] Retrieved ${calls.length} calls from Retell API`);

    // Map Retell agent IDs to our internal agent data
    const agentMapping = new Map();
    const userAgentMapping = new Map();

    if (calls.length > 0) {
      // Get all agents that match the Retell agent IDs in the response
      const retellAgentIds = [...new Set(calls.map((call: any) => call.agent_id))];
      
      const { data: agents, error: agentsError } = await supabaseClient
        .from('agents')
        .select('id, retell_agent_id, rate_per_minute')
        .in('retell_agent_id', retellAgentIds);

      if (agentsError) {
        console.error('[FETCH-RETELL-CALLS] Error fetching agents:', agentsError);
        return createErrorResponse('Failed to fetch agent mappings', 500);
      }

      // Build agent mapping
      for (const agent of agents || []) {
        agentMapping.set(agent.retell_agent_id, agent);
      }

      // Get user agent mappings
      const agentIds = (agents || []).map(agent => agent.id);
      if (agentIds.length > 0) {
        const { data: userAgents, error: userAgentError } = await supabaseClient
          .from('user_agents')
          .select('agent_id, user_id, company_id')
          .in('agent_id', agentIds);

        if (userAgentError) {
          console.error('[FETCH-RETELL-CALLS] Error fetching user agents:', userAgentError);
        } else {
          for (const userAgent of userAgents || []) {
            userAgentMapping.set(userAgent.agent_id, userAgent);
          }
        }
      }
    }

    // Transform calls to include our internal data
    const transformedCalls = calls.map((call: any) => {
      const agent = agentMapping.get(call.agent_id);
      const userAgent = agent ? userAgentMapping.get(agent.id) : null;

      return {
        // Retell call data
        retell_call_id: call.call_id,
        retell_agent_id: call.agent_id,
        from_number: call.from_number,
        to_number: call.to_number,
        start_timestamp: call.start_timestamp,
        end_timestamp: call.end_timestamp,
        duration: call.duration,
        duration_ms: call.duration_ms,
        call_status: call.call_status,
        disconnection_reason: call.disconnection_reason,
        recording_url: call.recording_url,
        transcript: call.transcript,
        transcript_url: call.transcript_url,
        sentiment: call.sentiment,
        sentiment_score: call.sentiment_score,
        disposition: call.disposition,
        latency_ms: call.latency_ms,
        call_summary: call.call_summary,
        
        // Our internal data
        internal_agent_id: agent?.id || null,
        internal_agent_name: agent?.name || null,
        rate_per_minute: agent?.rate_per_minute || null,
        user_id: userAgent?.user_id || null,
        company_id: userAgent?.company_id || null,
        estimated_cost: call.duration && agent?.rate_per_minute 
          ? (call.duration * agent.rate_per_minute / 60) 
          : null
      };
    });

    console.log(`[FETCH-RETELL-CALLS] Transformed ${transformedCalls.length} calls with internal mappings`);

    return createSuccessResponse({
      calls: transformedCalls,
      total_calls: calls.length,
      mapped_calls: transformedCalls.filter(call => call.internal_agent_id).length,
      unmapped_calls: transformedCalls.filter(call => !call.internal_agent_id).length,
      request_params: {
        agent_id: filterAgentId,
        limit,
        after_timestamp,
        before_timestamp
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[FETCH-RETELL-CALLS] Fatal error:', error);
    return createErrorResponse(`Fetch failed: ${error.message}`, 500);
  }
});
