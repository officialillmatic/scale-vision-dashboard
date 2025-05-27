
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { mapRetellCallToSupabase } from "./retellDataMapper.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const retellApiKey = env('RETELL_API_KEY');
const retellApiBaseUrl = Deno.env.get('RETELL_API_BASE_URL') || 'https://api.retellai.com/v2';

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[SYNC-CALLS-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      console.log(`[SYNC-CALLS-${requestId}] Request body:`, JSON.stringify(requestBody));

      // Handle test mode
      if (requestBody.test) {
        console.log(`[SYNC-CALLS-${requestId}] Test mode - checking Retell API connectivity`);
        try {
          const testResponse = await fetch(`${retellApiBaseUrl}/list-calls`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 1 })
          });

          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error(`[SYNC-CALLS-${requestId}] Test failed: ${testResponse.status} - ${errorText}`);
            throw new Error(`Retell API responded with ${testResponse.status}: ${errorText}`);
          }

          const testData = await testResponse.json();
          console.log(`[SYNC-CALLS-${requestId}] Test successful - API connectivity verified`);
          
          return createSuccessResponse({
            message: 'Retell API connectivity test passed',
            callsFound: testData?.calls?.length || 0,
            hasMore: testData?.has_more || false,
            requestId
          });
        } catch (error) {
          console.error(`[SYNC-CALLS-${requestId}] Test failed:`, error);
          return createErrorResponse(`Test failed: ${error.message}`, 500);
        }
      }

      // Get agents with Retell integration
      console.log(`[SYNC-CALLS-${requestId}] Fetching agents with Retell integration...`);
      const { data: agents, error: agentsError } = await supabaseClient
        .from('agents')
        .select('id, retell_agent_id, rate_per_minute, name')
        .not('retell_agent_id', 'is', null)
        .eq('status', 'active');

      if (agentsError) {
        console.error(`[SYNC-CALLS-${requestId}] Error fetching agents:`, agentsError);
        return createErrorResponse(`Failed to fetch agents: ${agentsError.message}`, 500);
      }

      console.log(`[SYNC-CALLS-${requestId}] Found ${agents?.length || 0} agents with Retell integration`);

      let totalSynced = 0;
      let totalProcessed = 0;
      let skippedAgents = 0;
      let processedAgents = 0;

      for (const agent of agents || []) {
        try {
          console.log(`[SYNC-CALLS-${requestId}] Processing agent: ${agent.name} (${agent.retell_agent_id})`);
          
          // Find user agent mapping for this agent
          const { data: userAgents, error: userAgentError } = await supabaseClient
            .from('user_agents')
            .select('user_id, company_id')
            .eq('agent_id', agent.id);

          if (userAgentError) {
            console.error(`[SYNC-CALLS-${requestId}] Error fetching user agents for agent ${agent.id}:`, userAgentError);
            continue;
          }

          if (!userAgents || userAgents.length === 0) {
            console.warn(`[SYNC-CALLS-${requestId}] No user mapping found for agent ${agent.id}, skipping...`);
            skippedAgents++;
            continue;
          }

          // Use the first user agent mapping
          const userAgent = userAgents[0];
          processedAgents++;

          let pageToken: string | null = null;
          let hasMore = true;
          let agentCallsProcessed = 0;

          while (hasMore) {
            const requestBody: any = {
              agent_id: agent.retell_agent_id,
              limit: 50 // Reduced batch size for better performance
            };

            if (pageToken) {
              requestBody.page_token = pageToken;
            }

            console.log(`[SYNC-CALLS-${requestId}] Fetching calls for ${agent.name}, page token: ${pageToken || 'first'}`);

            const response = await fetch(`${retellApiBaseUrl}/list-calls`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${retellApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[SYNC-CALLS-${requestId}] Retell API error for agent ${agent.retell_agent_id}: ${response.status} - ${errorText}`);
              break;
            }

            const responseData = await response.json();
            const calls = responseData.calls || [];
            hasMore = responseData.has_more || false;
            pageToken = responseData.next_page_token || null;

            console.log(`[SYNC-CALLS-${requestId}] Retrieved ${calls.length} calls for ${agent.name}, hasMore: ${hasMore}`);

            // Process each call
            for (const call of calls) {
              try {
                // Check if call already exists
                const { data: existingCall } = await supabaseClient
                  .from('calls')
                  .select('id')
                  .eq('call_id', call.call_id)
                  .single();

                if (existingCall) {
                  console.log(`[SYNC-CALLS-${requestId}] Call ${call.call_id} already exists, skipping`);
                  totalProcessed++;
                  continue;
                }

                // Map Retell call data to Supabase format
                const mappedCall = mapRetellCallToSupabase(
                  call,
                  userAgent.user_id,
                  userAgent.company_id,
                  agent.id
                );

                // Upsert the call
                const { error: upsertError } = await supabaseClient
                  .from('calls')
                  .upsert(mappedCall, {
                    onConflict: 'call_id',
                    ignoreDuplicates: false
                  });

                if (upsertError) {
                  console.error(`[SYNC-CALLS-${requestId}] Error upserting call ${call.call_id}:`, upsertError);
                } else {
                  totalSynced++;
                  agentCallsProcessed++;
                }

                totalProcessed++;
              } catch (callError) {
                console.error(`[SYNC-CALLS-${requestId}] Error processing call ${call.call_id}:`, callError);
                totalProcessed++;
              }
            }

            // Add delay to prevent rate limiting
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          console.log(`[SYNC-CALLS-${requestId}] Completed agent ${agent.name}: ${agentCallsProcessed} calls processed`);

        } catch (error) {
          console.error(`[SYNC-CALLS-${requestId}] Error processing agent ${agent.retell_agent_id}:`, error);
        }
      }

      const summary = {
        message: 'Sync completed successfully',
        synced_calls: totalSynced,
        processed_calls: totalProcessed,
        agents_processed: processedAgents,
        agents_found: agents?.length || 0,
        skipped_agents: skippedAgents,
        requestId,
        timestamp: new Date().toISOString()
      };

      console.log(`[SYNC-CALLS-${requestId}] Final summary:`, summary);
      
      return createSuccessResponse(summary);
    }

    return createErrorResponse('Method not allowed - only POST requests supported', 405);

  } catch (error) {
    console.error(`[SYNC-CALLS-${requestId}] Fatal error:`, error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
