import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { handleCors, createErrorResponse, createSuccessResponse } from "./corsUtils.ts";
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

  console.log(`[SYNC-CALLS] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      console.log(`[SYNC-CALLS] Request body:`, JSON.stringify(requestBody));

      // Handle test mode
      if (requestBody.test) {
        console.log(`[SYNC-CALLS] Test mode - checking Retell API connectivity`);
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
            throw new Error(`Retell API responded with ${testResponse.status}: ${await testResponse.text()}`);
          }

          const testData = await testResponse.json();
          return createSuccessResponse({
            message: 'Retell API connectivity test passed',
            callsFound: testData?.calls?.length || 0,
            hasMore: testData?.has_more || false
          });
        } catch (error) {
          console.error(`[SYNC-CALLS] Test failed:`, error);
          return createErrorResponse(`Test failed: ${error.message}`, 500);
        }
      }

      // Get agents with Retell integration
      const { data: agents, error: agentsError } = await supabaseClient
        .from('agents')
        .select('id, retell_agent_id, rate_per_minute')
        .not('retell_agent_id', 'is', null);

      if (agentsError) {
        console.error(`[SYNC-CALLS] Error fetching agents:`, agentsError);
        return createErrorResponse(`Failed to fetch agents: ${agentsError.message}`, 500);
      }

      console.log(`[SYNC-CALLS] Found ${agents?.length || 0} agents with Retell integration`);

      let totalSynced = 0;
      let totalProcessed = 0;
      let skippedAgents = 0;

      for (const agent of agents || []) {
        try {
          console.log(`[SYNC-CALLS] Syncing calls for agent: ${agent.retell_agent_id}`);
          
          // Find user agent mapping for this agent
          const { data: userAgents, error: userAgentError } = await supabaseClient
            .from('user_agents')
            .select('user_id, company_id')
            .eq('agent_id', agent.id);

          if (userAgentError) {
            console.error(`[SYNC-CALLS] Error fetching user agents for agent ${agent.id}:`, userAgentError);
            continue;
          }

          if (!userAgents || userAgents.length === 0) {
            console.warn(`[SYNC-CALLS] No user mapping found for agent ${agent.id}, skipping...`);
            skippedAgents++;
            continue;
          }

          // Use the first user agent mapping
          const userAgent = userAgents[0];

          let pageToken: string | null = null;
          let hasMore = true;

          while (hasMore) {
            const requestBody: any = {
              agent_id: agent.retell_agent_id,
              limit: 100
            };

            if (pageToken) {
              requestBody.page_token = pageToken;
            }

            console.log(`[SYNC-CALLS] Fetching calls with body:`, JSON.stringify(requestBody));

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
              console.error(`[SYNC-CALLS] Retell API error for agent ${agent.retell_agent_id}: ${response.status} - ${errorText}`);
              break;
            }

            const responseData = await response.json();
            const calls = responseData.calls || [];
            hasMore = responseData.has_more || false;
            pageToken = responseData.next_page_token || null;

            console.log(`[SYNC-CALLS] Retrieved ${calls.length} calls, hasMore: ${hasMore}`);

            // Process each call
            for (const call of calls) {
              try {
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
                  console.error(`[SYNC-CALLS] Error upserting call ${call.call_id}:`, upsertError);
                } else {
                  totalSynced++;
                }

                totalProcessed++;
              } catch (callError) {
                console.error(`[SYNC-CALLS] Error processing call ${call.call_id}:`, callError);
                totalProcessed++;
              }
            }

            // Add a small delay between pages to avoid rate limiting
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } catch (error) {
          console.error(`[SYNC-CALLS] Error syncing agent ${agent.retell_agent_id}:`, error);
        }
      }

      console.log(`[SYNC-CALLS] Sync completed. Total synced: ${totalSynced}, Total processed: ${totalProcessed}, Skipped agents: ${skippedAgents}`);
      
      return createSuccessResponse({
        message: 'Sync completed successfully',
        synced_calls: totalSynced,
        processed_calls: totalProcessed,
        agentsProcessed: agents?.length || 0,
        skippedAgents: skippedAgents
      });
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[SYNC-CALLS] Fatal error:', error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
