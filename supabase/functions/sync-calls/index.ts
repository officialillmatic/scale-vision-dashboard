
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellApiKey = Deno.env.get('RETELL_API_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYNC-CALLS] Received ${req.method} request`);

  if (req.method !== 'POST') {
    console.error(`[SYNC-CALLS] Invalid method: ${req.method}`);
    return createErrorResponse('Method not allowed', 405);
  }

  if (!retellApiKey) {
    console.error('[SYNC-CALLS ERROR] Retell API key not configured');
    return createErrorResponse('Retell API key not configured', 500);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body to get optional parameters
    let requestBody = {};
    try {
      const text = await req.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      console.log('[SYNC-CALLS] No valid JSON body provided, using defaults');
    }

    const { 
      agent_id, 
      limit = 50, 
      after_call_id,
      sort_order = 'desc'
    } = requestBody as any;

    console.log(`[SYNC-CALLS] Starting sync with params:`, { agent_id, limit, after_call_id, sort_order });

    // Build Retell API URL with query parameters
    const params = new URLSearchParams();
    if (agent_id) params.append('agent_id', agent_id);
    if (limit) params.append('limit', String(Math.min(limit, 100))); // Cap at 100
    if (after_call_id) params.append('after_call_id', after_call_id);
    if (sort_order) params.append('sort_order', sort_order);

    const retellUrl = `https://api.retellai.com/v2/call?${params.toString()}`;
    
    console.log(`[SYNC-CALLS] Fetching from Retell API: ${retellUrl}`);

    // Fetch calls from Retell API
    const retellResponse = await fetch(retellUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error('[SYNC-CALLS ERROR] Retell API error:', {
        status: retellResponse.status,
        statusText: retellResponse.statusText,
        error: errorText
      });
      return createErrorResponse(`Retell API error: ${retellResponse.status} ${retellResponse.statusText}`, 500);
    }

    const retellData = await retellResponse.json();
    const calls = retellData.calls || [];
    
    console.log(`[SYNC-CALLS] Retrieved ${calls.length} calls from Retell API`);

    if (calls.length === 0) {
      return createSuccessResponse({
        message: 'No calls to sync',
        synced_count: 0,
        total_retrieved: 0
      });
    }

    let syncedCount = 0;
    let errors = [];

    // Process calls in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      console.log(`[SYNC-CALLS] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(calls.length / batchSize)}`);

      for (const call of batch) {
        try {
          if (!call.call_id || !call.agent_id) {
            console.warn(`[SYNC-CALLS] Skipping call with missing data:`, { 
              call_id: call.call_id, 
              agent_id: call.agent_id 
            });
            continue;
          }

          // Find the agent mapping
          const { data: agent, error: agentError } = await supabaseClient
            .from('agents')
            .select('id, rate_per_minute')
            .eq('retell_agent_id', call.agent_id)
            .single();

          if (agentError || !agent) {
            console.warn(`[SYNC-CALLS] Agent not found for retell_agent_id: ${call.agent_id}`);
            errors.push(`Agent not found: ${call.agent_id}`);
            continue;
          }

          // Find user agent mapping
          const { data: userAgent, error: userAgentError } = await supabaseClient
            .from('user_agents')
            .select('user_id, company_id')
            .eq('agent_id', agent.id)
            .single();

          if (userAgentError || !userAgent) {
            console.warn(`[SYNC-CALLS] User mapping not found for agent: ${agent.id}`);
            errors.push(`User mapping not found for agent: ${agent.id}`);
            continue;
          }

          // Calculate duration and cost
          let durationSec = 0;
          if (call.duration_ms) {
            durationSec = Math.round(call.duration_ms / 1000);
          } else if (call.duration) {
            durationSec = Math.round(call.duration);
          } else if (call.start_timestamp && call.end_timestamp) {
            durationSec = Math.round((call.end_timestamp - call.start_timestamp) / 1000);
          }

          const costUsd = (durationSec / 60) * (agent.rate_per_minute || 0.02);

          // Prepare call data
          const callData = {
            call_id: call.call_id,
            user_id: userAgent.user_id,
            company_id: userAgent.company_id,
            agent_id: agent.id,
            from_number: call.from_number || 'unknown',
            to_number: call.to_number || 'unknown',
            from: call.from_number || 'unknown',
            to: call.to_number || 'unknown',
            duration_sec: durationSec,
            start_time: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
            timestamp: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
            cost_usd: costUsd,
            call_status: call.call_status || 'completed',
            call_type: 'phone_call',
            sentiment: call.sentiment || 'neutral',
            sentiment_score: call.sentiment_score,
            disconnection_reason: call.disconnection_reason,
            recording_url: call.recording_url,
            audio_url: call.recording_url,
            transcript: call.transcript,
            transcript_url: call.transcript_url,
            disposition: call.disposition,
            latency_ms: call.latency_ms || 0
          };

          // Upsert the call
          const { error: upsertError } = await supabaseClient
            .from('calls')
            .upsert(callData, {
              onConflict: 'call_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`[SYNC-CALLS] Failed to upsert call ${call.call_id}:`, upsertError);
            errors.push(`Failed to sync call ${call.call_id}: ${upsertError.message}`);
          } else {
            syncedCount++;
            console.log(`[SYNC-CALLS] Successfully synced call: ${call.call_id}`);
          }

        } catch (callError) {
          console.error(`[SYNC-CALLS] Error processing call ${call.call_id}:`, callError);
          errors.push(`Error processing call ${call.call_id}: ${callError.message}`);
        }
      }

      // Small delay between batches to be gentle on the database
      if (i + batchSize < calls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[SYNC-CALLS] Sync completed: ${syncedCount}/${calls.length} calls synced`);

    return createSuccessResponse({
      message: `Successfully synced ${syncedCount} out of ${calls.length} calls`,
      synced_count: syncedCount,
      total_retrieved: calls.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error reporting
      has_more_errors: errors.length > 10
    });

  } catch (error) {
    console.error('[SYNC-CALLS FATAL ERROR] Sync error:', error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
