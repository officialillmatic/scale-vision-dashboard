
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellApiKey = Deno.env.get('RETELL_API_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYNC-CALLS] Received ${req.method} request`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (!retellApiKey) {
      console.error('[SYNC-CALLS] RETELL_API_KEY not configured');
      return createErrorResponse('Retell API key not configured', 500);
    }

    // Get all agents from our database that have retell_agent_id
    const { data: agents, error: agentsError } = await supabaseClient
      .from('agents')
      .select('id, retell_agent_id, rate_per_minute')
      .not('retell_agent_id', 'is', null);

    if (agentsError) {
      console.error('[SYNC-CALLS] Error fetching agents:', agentsError);
      return createErrorResponse('Failed to fetch agents', 500);
    }

    if (!agents || agents.length === 0) {
      console.log('[SYNC-CALLS] No agents with retell_agent_id found');
      return createSuccessResponse({
        message: 'No agents with Retell integration found',
        synced_calls: 0,
        agents_checked: 0
      });
    }

    console.log(`[SYNC-CALLS] Found ${agents.length} agents with Retell integration`);

    let totalSyncedCalls = 0;
    const syncResults = [];

    // Sync calls for each agent
    for (const agent of agents) {
      try {
        console.log(`[SYNC-CALLS] Syncing calls for agent: ${agent.retell_agent_id}`);

        // Fetch calls from Retell API for this agent
        const retellResponse = await fetch(`https://api.retellai.com/v2/get-calls`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!retellResponse.ok) {
          console.error(`[SYNC-CALLS] Retell API error for agent ${agent.retell_agent_id}:`, retellResponse.status);
          continue;
        }

        const retellData = await retellResponse.json();
        const agentCalls = retellData.calls?.filter((call: any) => call.agent_id === agent.retell_agent_id) || [];

        console.log(`[SYNC-CALLS] Found ${agentCalls.length} calls for agent ${agent.retell_agent_id}`);

        // Get user mapping for this agent
        const { data: userAgent, error: userAgentError } = await supabaseClient
          .from('user_agents')
          .select('user_id, company_id')
          .eq('agent_id', agent.id)
          .single();

        if (userAgentError || !userAgent) {
          console.error(`[SYNC-CALLS] No user mapping found for agent ${agent.id}`);
          continue;
        }

        // Process each call
        for (const retellCall of agentCalls) {
          try {
            const callData = {
              call_id: retellCall.call_id,
              user_id: userAgent.user_id,
              company_id: userAgent.company_id,
              agent_id: agent.id,
              timestamp: retellCall.start_timestamp ? new Date(retellCall.start_timestamp).toISOString() : new Date().toISOString(),
              start_time: retellCall.start_timestamp ? new Date(retellCall.start_timestamp).toISOString() : null,
              duration_sec: retellCall.duration || 0,
              cost_usd: (retellCall.duration || 0) * (agent.rate_per_minute || 0.02) / 60,
              call_status: retellCall.call_status || 'completed',
              from: retellCall.from_number || 'unknown',
              to: retellCall.to_number || 'unknown',
              from_number: retellCall.from_number,
              to_number: retellCall.to_number,
              recording_url: retellCall.recording_url,
              transcript: retellCall.transcript,
              transcript_url: retellCall.transcript_url,
              sentiment: retellCall.sentiment,
              sentiment_score: retellCall.sentiment_score,
              disposition: retellCall.disposition,
              disconnection_reason: retellCall.disconnection_reason,
              latency_ms: retellCall.latency_ms,
              call_type: 'phone_call',
              call_summary: retellCall.call_summary
            };

            // Upsert call data
            const { error: upsertError } = await supabaseClient
              .from('calls')
              .upsert(callData, {
                onConflict: 'call_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`[SYNC-CALLS] Error upserting call ${retellCall.call_id}:`, upsertError);
            } else {
              totalSyncedCalls++;
              console.log(`[SYNC-CALLS] Successfully synced call: ${retellCall.call_id}`);
            }

          } catch (callError) {
            console.error(`[SYNC-CALLS] Error processing call ${retellCall.call_id}:`, callError);
          }
        }

        syncResults.push({
          agent_id: agent.retell_agent_id,
          calls_found: agentCalls.length,
          calls_synced: agentCalls.length
        });

      } catch (agentError) {
        console.error(`[SYNC-CALLS] Error processing agent ${agent.retell_agent_id}:`, agentError);
        syncResults.push({
          agent_id: agent.retell_agent_id,
          calls_found: 0,
          calls_synced: 0,
          error: agentError.message
        });
      }
    }

    console.log(`[SYNC-CALLS] Sync completed. Total calls synced: ${totalSyncedCalls}`);

    return createSuccessResponse({
      message: 'Call sync completed successfully',
      synced_calls: totalSyncedCalls,
      agents_checked: agents.length,
      sync_results: syncResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SYNC-CALLS] Fatal error:', error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
