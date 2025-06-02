
// Main sync orchestration logic

import { AgentProcessor, AgentSyncResult } from "./agentProcessor.ts";
import { RetellApiClient } from "./retellApiClient.ts";

export interface SyncSummary {
  message: string;
  synced_calls: number;
  processed_calls: number;
  agents_processed: number;
  agents_found: number;
  skipped_agents: number;
  total_calls_from_api: number;
  requestId: string;
  timestamp: string;
}

export class SyncOrchestrator {
  constructor(
    private supabaseClient: any,
    private retellClient: RetellApiClient,
    private requestId: string
  ) {}

  async performSync(): Promise<SyncSummary> {
    console.log(`[SYNC-CALLS-${this.requestId}] === STARTING FULL CALL SYNC ===`);
    console.log(`[SYNC-CALLS-${this.requestId}] Strategy: Fetch ALL calls with minimal validation`);
    
    let totalCallsFromApi = 0;
    let totalSynced = 0;
    let totalProcessed = 0;
    let pageToken: string | undefined = undefined;
    let pageCount = 0;

    // First, fetch ALL calls from Retell API (without agent filtering)
    try {
      let hasMore = true;
      
      while (hasMore && pageCount < 10) { // Safety limit to prevent infinite loops
        pageCount++;
        console.log(`[SYNC-CALLS-${this.requestId}] === FETCHING PAGE ${pageCount} ===`);
        console.log(`[SYNC-CALLS-${this.requestId}] Page token: ${pageToken || 'first_page'}`);
        
        const apiResponse = await this.retellClient.fetchAllCalls(100, pageToken);
        
        const calls = apiResponse.calls || [];
        hasMore = apiResponse.has_more || false;
        pageToken = apiResponse.next_page_token;
        
        console.log(`[SYNC-CALLS-${this.requestId}] Page ${pageCount} results:`);
        console.log(`[SYNC-CALLS-${this.requestId}] - Calls in this page: ${calls.length}`);
        console.log(`[SYNC-CALLS-${this.requestId}] - Has more pages: ${hasMore}`);
        console.log(`[SYNC-CALLS-${this.requestId}] - Next page token: ${pageToken || 'none'}`);
        
        totalCallsFromApi += calls.length;
        
        // Process each call with minimal validation
        for (const call of calls) {
          try {
            console.log(`[SYNC-CALLS-${this.requestId}] === PROCESSING CALL ${call.call_id} ===`);
            console.log(`[SYNC-CALLS-${this.requestId}] Call agent_id: ${call.agent_id}`);
            console.log(`[SYNC-CALLS-${this.requestId}] Call status: ${call.call_status}`);
            console.log(`[SYNC-CALLS-${this.requestId}] Call start time: ${call.start_timestamp}`);
            
            // MINIMAL VALIDATION - only check essential fields
            if (!call.call_id) {
              console.error(`[SYNC-CALLS-${this.requestId}] VALIDATION FAILED: Missing call_id`);
              totalProcessed++;
              continue;
            }

            if (!call.start_timestamp) {
              console.error(`[SYNC-CALLS-${this.requestId}] VALIDATION FAILED: Missing start_timestamp`);
              totalProcessed++;
              continue;
            }

            console.log(`[SYNC-CALLS-${this.requestId}] VALIDATION PASSED: Essential fields present`);

            // Check if call already exists
            const { data: existingCall, error: checkError } = await this.supabaseClient
              .from('retell_calls')
              .select('id')
              .eq('call_id', call.call_id)
              .maybeSingle();

            if (checkError) {
              console.error(`[SYNC-CALLS-${this.requestId}] Error checking existing call:`, checkError);
              totalProcessed++;
              continue;
            }

            if (existingCall) {
              console.log(`[SYNC-CALLS-${this.requestId}] Call ${call.call_id} already exists, skipping`);
              totalProcessed++;
              continue;
            }

            // Try to find matching agent in our database (OPTIONAL - no validation)
            let agent = null;
            let userAgent = null;
            
            if (call.agent_id) {
              console.log(`[SYNC-CALLS-${this.requestId}] Attempting to find agent for retell_agent_id: ${call.agent_id}`);
              const { data: agentData, error: agentError } = await this.supabaseClient
                .from('agents')
                .select('id, name, company_id')
                .eq('retell_agent_id', call.agent_id)
                .maybeSingle();

              if (!agentError && agentData) {
                agent = agentData;
                console.log(`[SYNC-CALLS-${this.requestId}] Found matching agent: ${agent.name} (${agent.id})`);

                // Try to find user agent mapping (OPTIONAL - no validation)
                const { data: userAgents, error: userAgentError } = await this.supabaseClient
                  .from('user_agents')
                  .select('user_id, company_id')
                  .eq('agent_id', agent.id)
                  .limit(1);

                if (!userAgentError && userAgents && userAgents.length > 0) {
                  userAgent = userAgents[0];
                  console.log(`[SYNC-CALLS-${this.requestId}] Found user mapping: user_id=${userAgent.user_id}, company_id=${userAgent.company_id}`);
                } else {
                  console.log(`[SYNC-CALLS-${this.requestId}] No user mapping found for agent ${agent.id}`);
                }
              } else {
                console.log(`[SYNC-CALLS-${this.requestId}] No matching agent found for retell_agent_id: ${call.agent_id}`);
              }
            } else {
              console.log(`[SYNC-CALLS-${this.requestId}] Call has no agent_id`);
            }

            // Map and insert the call with MINIMAL validation and NULL for missing values
            const mappedCall = this.mapCallDataMinimal(call, userAgent, agent);
            
            console.log(`[SYNC-CALLS-${this.requestId}] === ATTEMPTING DATABASE INSERT ===`);
            console.log(`[SYNC-CALLS-${this.requestId}] Mapped call data:`, {
              call_id: mappedCall.call_id,
              user_id: mappedCall.user_id,
              company_id: mappedCall.company_id,
              agent_id: mappedCall.agent_id,
              duration_sec: mappedCall.duration_sec,
              call_status: mappedCall.call_status
            });

            const { data: insertData, error: insertError } = await this.supabaseClient
              .from('retell_calls')
              .insert(mappedCall)
              .select();

            if (insertError) {
              console.error(`[SYNC-CALLS-${this.requestId}] DATABASE INSERT FAILED for call ${call.call_id}:`, insertError);
              console.error(`[SYNC-CALLS-${this.requestId}] Insert error details:`, JSON.stringify(insertError, null, 2));
              totalProcessed++;
              continue;
            }

            console.log(`[SYNC-CALLS-${this.requestId}] ✅ Successfully synced call ${call.call_id}`);
            totalSynced++;
            totalProcessed++;

          } catch (callError) {
            console.error(`[SYNC-CALLS-${this.requestId}] Error processing call ${call.call_id}:`, callError);
            totalProcessed++;
          }
        }

        // Safety delay between pages
        if (hasMore) {
          console.log(`[SYNC-CALLS-${this.requestId}] Waiting before next page...`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error during full sync:`, error);
      throw error;
    }

    console.log(`[SYNC-CALLS-${this.requestId}] === SYNC COMPLETED ===`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total pages fetched: ${pageCount}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total calls from API: ${totalCallsFromApi}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total calls processed: ${totalProcessed}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total calls synced: ${totalSynced}`);

    return {
      message: 'Sync completed successfully',
      synced_calls: totalSynced,
      processed_calls: totalProcessed,
      agents_processed: 0, // Not using agent-based processing anymore
      agents_found: 0,
      skipped_agents: 0,
      total_calls_from_api: totalCallsFromApi,
      requestId: this.requestId,
      timestamp: new Date().toISOString()
    };
  }

  async performTest(): Promise<any> {
    console.log(`[SYNC-CALLS-${this.requestId}] Starting connectivity test...`);
    
    const testData = await this.retellClient.testConnectivity(this.requestId);
    console.log(`[SYNC-CALLS-${this.requestId}] Test successful - API connectivity verified`);
    
    return {
      message: 'Retell API connectivity test passed',
      callsFound: testData?.calls?.length || 0,
      hasMore: testData?.has_more || false,
      requestId: this.requestId,
      apiConnected: true
    };
  }

  private mapCallDataMinimal(call: any, userAgent: any, agent: any) {
    const timestamp = call.start_timestamp 
      ? new Date(call.start_timestamp * 1000) 
      : new Date();
    
    const duration = call.duration_sec || (call.duration_ms ? Math.floor(call.duration_ms / 1000) : 0);
    const cost = call.call_cost?.combined_cost || 0;
    const ratePerMinute = 0.17; // Default rate
    const calculatedRevenue = (duration / 60) * ratePerMinute;

    // Use NULL for missing values - NO VALIDATION
    const userId = userAgent?.user_id || null;
    const companyId = userAgent?.company_id || agent?.company_id || null; // NULL if missing
    const agentId = agent?.id || null;

    console.log(`[SYNC-CALLS-${this.requestId}] Mapping call ${call.call_id} with MINIMAL validation:`);
    console.log(`[SYNC-CALLS-${this.requestId}] - userId: ${userId} (NULL allowed)`);
    console.log(`[SYNC-CALLS-${this.requestId}] - companyId: ${companyId} (NULL allowed - NO VALIDATION)`);
    console.log(`[SYNC-CALLS-${this.requestId}] - agentId: ${agentId} (NULL allowed)`);
    console.log(`[SYNC-CALLS-${this.requestId}] - duration: ${duration}s`);
    console.log(`[SYNC-CALLS-${this.requestId}] - cost: $${cost}`);

    return {
      call_id: call.call_id,
      user_id: userId, // NULL allowed
      company_id: companyId, // NULL allowed - NO VALIDATION
      agent_id: agentId, // NULL allowed
      retell_agent_id: call.agent_id || null,
      start_timestamp: timestamp.toISOString(),
      end_timestamp: call.end_timestamp ? new Date(call.end_timestamp * 1000).toISOString() : null,
      duration_sec: duration,
      duration: duration,
      cost_usd: cost,
      revenue_amount: calculatedRevenue,
      revenue: calculatedRevenue,
      billing_duration_sec: duration,
      rate_per_minute: ratePerMinute,
      call_status: call.call_status || 'ended',
      status: call.call_status || 'ended',
      from_number: call.from_number || null,
      to_number: call.to_number || null,
      disconnection_reason: call.disconnection_reason || null,
      recording_url: call.recording_url || null,
      transcript: call.transcript || null,
      transcript_url: call.transcript_url || null,
      sentiment: call.call_analysis?.user_sentiment || null,
      sentiment_score: null,
      result_sentiment: call.call_analysis ? JSON.stringify(call.call_analysis) : null,
      disposition: call.disposition || null,
      latency_ms: call.latency?.llm?.p50 || null,
      call_summary: call.call_analysis?.call_summary || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
