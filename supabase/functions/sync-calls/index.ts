
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const retellApiKey = env('RETELL_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYNC-CALLS] Received ${req.method} request`);

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('[SYNC-CALLS] Health check requested');
    
    return new Response("ok", {
      headers: { ...corsHeaders, "Content-Profile": "public" },
    });
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      requestBody = {};
    }
    
    const { company_id, test, force, limit } = requestBody;

    console.log(`[SYNC-CALLS] Request body:`, requestBody);

    // If this is a test request, just verify API connectivity
    if (test) {
      console.log('[SYNC-CALLS] Test mode - checking Retell API connectivity');
      
      try {
        const retellResponse = await fetch(`https://api.retellai.com/v2/get-calls?limit=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!retellResponse.ok) {
          throw new Error(`Retell API responded with ${retellResponse.status}`);
        }

        const retellData = await retellResponse.json();
        console.log('[SYNC-CALLS] Test successful, Retell API accessible');
        
        return createSuccessResponse({
          message: 'Test successful - Retell API is accessible',
          api_status: 'healthy',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[SYNC-CALLS] Test failed:', error);
        return createErrorResponse(`Retell API test failed: ${error.message}`, 500);
      }
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
      
      // Create a test call record if force is enabled
      if (force && company_id) {
        console.log('[SYNC-CALLS] Force mode - creating test call record');
        
        const testCallData = {
          call_id: `test_call_${Date.now()}`,
          user_id: '123e4567-e89b-12d3-a456-426614174000', // Dummy user ID for test
          company_id: company_id,
          agent_id: null,
          timestamp: new Date().toISOString(),
          start_time: new Date().toISOString(),
          duration_sec: 60,
          cost_usd: 0.02,
          call_status: 'completed',
          from: '+1234567890',
          to: '+0987654321',
          call_type: 'phone_call',
          transcript: 'Test call transcript for system health verification'
        };

        const { data: testCall, error: testCallError } = await supabaseClient
          .from('calls')
          .insert(testCallData)
          .select()
          .single();

        if (testCallError) {
          console.error('[SYNC-CALLS] Error creating test call:', testCallError);
          return createErrorResponse(`Failed to create test call: ${testCallError.message}`, 500);
        }

        console.log('[SYNC-CALLS] Test call created successfully:', testCall.id);
        
        return createSuccessResponse({
          message: 'Test call created successfully',
          test_call_id: testCall.id,
          synced_calls: 1,
          agents_checked: 0,
          timestamp: new Date().toISOString()
        });
      }
      
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
