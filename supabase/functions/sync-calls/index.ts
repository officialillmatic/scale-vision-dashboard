
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { mapRetellCallToSupabase } from "../_shared/retellDataMapper.ts";

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
          const testResponse = await fetch('https://api.retellai.com/v2/list-calls', {
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

      // Get company_id from request body if provided
      const targetCompanyId = requestBody.company_id;
      let whereClause = 'not(retell_agent_id, is, null)';
      
      if (targetCompanyId) {
        console.log(`[SYNC-CALLS] Targeting specific company: ${targetCompanyId}`);
        // Get agents for specific company through user_agents mapping
        const { data: companyAgents, error: companyAgentsError } = await supabaseClient
          .from('user_agents')
          .select(`
            agent_id,
            agents!inner(id, retell_agent_id, rate_per_minute)
          `)
          .eq('company_id', targetCompanyId)
          .not('agents.retell_agent_id', 'is', null);

        if (companyAgentsError) {
          console.error(`[SYNC-CALLS] Error fetching company agents:`, companyAgentsError);
          return createErrorResponse(`Failed to fetch company agents: ${companyAgentsError.message}`, 500);
        }

        if (!companyAgents || companyAgents.length === 0) {
          console.log(`[SYNC-CALLS] No agents with Retell integration found for company ${targetCompanyId}`);
          return createSuccessResponse({
            message: 'No agents with Retell integration found for this company',
            synced_calls: 0,
            processed_calls: 0,
            agentsProcessed: 0,
            company_id: targetCompanyId
          });
        }

        console.log(`[SYNC-CALLS] Found ${companyAgents.length} agents for company ${targetCompanyId}`);
        
        // Use agent IDs to filter
        const agentIds = companyAgents.map(ca => ca.agents.id);
        whereClause = `id.in.(${agentIds.join(',')}) and not(retell_agent_id, is, null)`;
      }

      // Get agents with Retell integration
      const { data: agents, error: agentsError } = await supabaseClient
        .from('agents')
        .select('id, retell_agent_id, rate_per_minute')
        .or(whereClause);

      if (agentsError) {
        console.error(`[SYNC-CALLS] Error fetching agents:`, agentsError);
        return createErrorResponse(`Failed to fetch agents: ${agentsError.message}`, 500);
      }

      console.log(`[SYNC-CALLS] Found ${agents?.length || 0} agents with Retell integration`);

      let totalSynced = 0;
      let totalProcessed = 0;
      const syncResults: any[] = [];

      for (const agent of agents || []) {
        try {
          console.log(`[SYNC-CALLS] Syncing calls for agent: ${agent.retell_agent_id}`);
          
          // Find user agent mapping for this agent
          let userAgentQuery = supabaseClient
            .from('user_agents')
            .select('user_id, company_id')
            .eq('agent_id', agent.id);
          
          // If targeting specific company, filter by company_id
          if (targetCompanyId) {
            userAgentQuery = userAgentQuery.eq('company_id', targetCompanyId);
          }

          const { data: userAgent, error: userAgentError } = await userAgentQuery.single();

          if (userAgentError || !userAgent) {
            console.error(`[SYNC-CALLS] No user mapping found for agent ${agent.id}:`, userAgentError);
            syncResults.push({
              agent_id: agent.id,
              retell_agent_id: agent.retell_agent_id,
              status: 'error',
              error: 'No user mapping found',
              calls_synced: 0
            });
            continue;
          }

          let agentSynced = 0;
          let agentProcessed = 0;
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

            console.log(`[SYNC-CALLS] Fetching calls for agent ${agent.retell_agent_id}, page token: ${pageToken || 'none'}`);

            const response = await fetch('https://api.retellai.com/v2/list-calls', {
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
              syncResults.push({
                agent_id: agent.id,
                retell_agent_id: agent.retell_agent_id,
                status: 'error',
                error: `Retell API error: ${response.status}`,
                calls_synced: agentSynced
              });
              break;
            }

            const responseData = await response.json();
            const calls = responseData.calls || [];
            hasMore = responseData.has_more || false;
            pageToken = responseData.next_page_token || null;

            console.log(`[SYNC-CALLS] Retrieved ${calls.length} calls for agent ${agent.retell_agent_id}, hasMore: ${hasMore}`);

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
                  agentSynced++;
                }

                agentProcessed++;
              } catch (callError) {
                console.error(`[SYNC-CALLS] Error processing call ${call.call_id}:`, callError);
                agentProcessed++;
              }
            }

            // Add a small delay between pages to avoid rate limiting
            if (hasMore) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          syncResults.push({
            agent_id: agent.id,
            retell_agent_id: agent.retell_agent_id,
            status: 'success',
            calls_synced: agentSynced,
            calls_processed: agentProcessed
          });

          totalSynced += agentSynced;
          totalProcessed += agentProcessed;

        } catch (error) {
          console.error(`[SYNC-CALLS] Error syncing agent ${agent.retell_agent_id}:`, error);
          syncResults.push({
            agent_id: agent.id,
            retell_agent_id: agent.retell_agent_id,
            status: 'error',
            error: error.message,
            calls_synced: 0
          });
        }
      }

      console.log(`[SYNC-CALLS] Sync completed. Total synced: ${totalSynced}, Total processed: ${totalProcessed}`);
      
      return createSuccessResponse({
        message: 'Sync completed successfully',
        synced_calls: totalSynced,
        processed_calls: totalProcessed,
        agentsProcessed: agents?.length || 0,
        company_id: targetCompanyId || null,
        sync_results: syncResults
      });
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[SYNC-CALLS] Fatal error:', error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
