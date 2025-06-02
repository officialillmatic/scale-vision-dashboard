
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
  validation_debug?: any[];
  debug_info?: any;
}

export class SyncOrchestrator {
  constructor(
    private supabaseClient: any,
    private retellClient: RetellApiClient,
    private requestId: string,
    private bypassValidation: boolean = false,
    private debugMode: boolean = false
  ) {}

  async performSync(): Promise<SyncSummary> {
    console.log(`[SYNC-CALLS-${this.requestId}] === STARTING FULL CALL SYNC ===`);
    console.log(`[SYNC-CALLS-${this.requestId}] Validation bypass: ${this.bypassValidation}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Debug mode: ${this.debugMode}`);
    
    let totalCallsFromApi = 0;
    let totalSynced = 0;
    let totalProcessed = 0;
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    let validationDebug: any[] = [];
    let debugInfo: any = {
      api_responses: [],
      insertion_attempts: [],
      validation_results: [],
      errors: []
    };

    // First, fetch ALL calls from Retell API (without agent filtering)
    try {
      let hasMore = true;
      
      while (hasMore && pageCount < 10) { // Safety limit to prevent infinite loops
        pageCount++;
        console.log(`[SYNC-CALLS-${this.requestId}] === FETCHING PAGE ${pageCount} ===`);
        
        const apiResponse = await this.retellClient.fetchAllCalls(100, pageToken);
        
        if (this.debugMode) {
          debugInfo.api_responses.push({
            page: pageCount,
            calls_count: apiResponse.calls?.length || 0,
            has_more: apiResponse.has_more,
            response_keys: Object.keys(apiResponse),
            first_call_sample: apiResponse.calls?.[0] || null
          });
        }
        
        const calls = apiResponse.calls || [];
        hasMore = apiResponse.has_more || false;
        pageToken = apiResponse.next_page_token;
        
        console.log(`[SYNC-CALLS-${this.requestId}] Page ${pageCount} results: ${calls.length} calls`);
        
        totalCallsFromApi += calls.length;
        
        // Process each call
        for (const call of calls) {
          try {
            console.log(`[SYNC-CALLS-${this.requestId}] === PROCESSING CALL ${call.call_id} ===`);
            
            const validationResult = this.validateCall(call);
            validationDebug.push({
              call_id: call.call_id,
              validation: validationResult,
              bypass: this.bypassValidation
            });

            if (this.debugMode) {
              debugInfo.validation_results.push({
                call_id: call.call_id,
                is_valid: validationResult.isValid,
                errors: validationResult.errors,
                bypass_validation: this.bypassValidation,
                call_keys: Object.keys(call),
                has_agent_id: !!call.agent_id,
                has_start_timestamp: !!call.start_timestamp
              });
            }

            if (!this.bypassValidation && !validationResult.isValid) {
              console.error(`[SYNC-CALLS-${this.requestId}] VALIDATION FAILED for ${call.call_id}:`, validationResult.errors);
              if (this.debugMode) {
                debugInfo.errors.push({
                  type: 'validation_failed',
                  call_id: call.call_id,
                  errors: validationResult.errors
                });
              }
              totalProcessed++;
              continue;
            }

            if (this.bypassValidation) {
              console.log(`[SYNC-CALLS-${this.requestId}] BYPASSING VALIDATION for ${call.call_id}`);
            } else {
              console.log(`[SYNC-CALLS-${this.requestId}] VALIDATION PASSED for ${call.call_id}`);
            }

            // Check if call already exists
            const { data: existingCall, error: checkError } = await this.supabaseClient
              .from('retell_calls')
              .select('id')
              .eq('call_id', call.call_id)
              .maybeSingle();

            if (checkError) {
              console.error(`[SYNC-CALLS-${this.requestId}] Error checking existing call:`, checkError);
              if (this.debugMode) {
                debugInfo.errors.push({
                  type: 'check_existing_error',
                  call_id: call.call_id,
                  error: checkError
                });
              }
              totalProcessed++;
              continue;
            }

            if (existingCall) {
              console.log(`[SYNC-CALLS-${this.requestId}] Call ${call.call_id} already exists, skipping`);
              totalProcessed++;
              continue;
            }

            // Try to find matching agent (OPTIONAL when bypassing validation)
            let agent = null;
            let userAgent = null;
            
            if (call.agent_id) {
              console.log(`[SYNC-CALLS-${this.requestId}] Looking for agent: ${call.agent_id}`);
              const { data: agentData, error: agentError } = await this.supabaseClient
                .from('agents')
                .select('id, name, company_id')
                .eq('retell_agent_id', call.agent_id)
                .maybeSingle();

              if (!agentError && agentData) {
                agent = agentData;
                console.log(`[SYNC-CALLS-${this.requestId}] Found agent: ${agent.name}`);

                // Try to find user agent mapping
                const { data: userAgents, error: userAgentError } = await this.supabaseClient
                  .from('user_agents')
                  .select('user_id, company_id')
                  .eq('agent_id', agent.id)
                  .limit(1);

                if (!userAgentError && userAgents && userAgents.length > 0) {
                  userAgent = userAgents[0];
                  console.log(`[SYNC-CALLS-${this.requestId}] Found user mapping: ${userAgent.user_id}`);
                }
              }
            }

            // Map and insert the call (with or without validation)
            const mappedCall = this.mapCallData(call, userAgent, agent);
            
            if (this.debugMode) {
              debugInfo.insertion_attempts.push({
                call_id: call.call_id,
                mapped_call_keys: Object.keys(mappedCall),
                user_id: mappedCall.user_id,
                company_id: mappedCall.company_id,
                agent_id: mappedCall.agent_id,
                has_required_fields: {
                  call_id: !!mappedCall.call_id,
                  start_timestamp: !!mappedCall.start_timestamp,
                  duration_sec: mappedCall.duration_sec !== undefined,
                  cost_usd: mappedCall.cost_usd !== undefined
                }
              });
            }
            
            console.log(`[SYNC-CALLS-${this.requestId}] === ATTEMPTING DATABASE INSERT ===`);
            console.log(`[SYNC-CALLS-${this.requestId}] Mapped call summary:`, {
              call_id: mappedCall.call_id,
              user_id: mappedCall.user_id,
              company_id: mappedCall.company_id,
              agent_id: mappedCall.agent_id,
              has_duration: !!mappedCall.duration_sec,
              has_timestamp: !!mappedCall.start_timestamp
            });

            const { data: insertData, error: insertError } = await this.supabaseClient
              .from('retell_calls')
              .insert(mappedCall)
              .select();

            if (insertError) {
              console.error(`[SYNC-CALLS-${this.requestId}] DATABASE INSERT FAILED:`, {
                call_id: call.call_id,
                error: insertError,
                mapped_data_summary: {
                  call_id: mappedCall.call_id,
                  user_id: mappedCall.user_id,
                  company_id: mappedCall.company_id,
                  agent_id: mappedCall.agent_id
                }
              });
              
              if (this.debugMode) {
                debugInfo.errors.push({
                  type: 'database_insert_error',
                  call_id: call.call_id,
                  error: insertError,
                  mapped_call: mappedCall
                });
              }
              
              totalProcessed++;
              continue;
            }

            console.log(`[SYNC-CALLS-${this.requestId}] ✅ Successfully synced call ${call.call_id}`);
            totalSynced++;
            totalProcessed++;

          } catch (callError) {
            console.error(`[SYNC-CALLS-${this.requestId}] Error processing call ${call.call_id}:`, callError);
            if (this.debugMode) {
              debugInfo.errors.push({
                type: 'call_processing_error',
                call_id: call.call_id,
                error: callError.message || callError
              });
            }
            totalProcessed++;
          }
        }

        // Safety delay between pages
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error during sync:`, error);
      if (this.debugMode) {
        debugInfo.errors.push({
          type: 'sync_error',
          error: error.message || error
        });
      }
      throw error;
    }

    console.log(`[SYNC-CALLS-${this.requestId}] === SYNC COMPLETED ===`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total calls from API: ${totalCallsFromApi}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total calls processed: ${totalProcessed}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Total calls synced: ${totalSynced}`);
    console.log(`[SYNC-CALLS-${this.requestId}] Validation debug entries: ${validationDebug.length}`);

    const summary: SyncSummary = {
      message: 'Sync completed successfully',
      synced_calls: totalSynced,
      processed_calls: totalProcessed,
      agents_processed: 0,
      agents_found: 0,
      skipped_agents: 0,
      total_calls_from_api: totalCallsFromApi,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
      validation_debug: validationDebug.slice(0, 10) // First 10 for debugging
    };

    if (this.debugMode) {
      summary.debug_info = debugInfo;
    }

    return summary;
  }

  private validateCall(call: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    console.log(`[SYNC-CALLS-${this.requestId}] === DETAILED VALIDATION for ${call.call_id} ===`);
    
    // Check call_id
    if (!call.call_id) {
      const error = 'Missing call_id';
      console.log(`[SYNC-CALLS-${this.requestId}] VALIDATION ERROR: ${error}`);
      errors.push(error);
    } else {
      console.log(`[SYNC-CALLS-${this.requestId}] ✓ call_id present: ${call.call_id}`);
    }

    // Check start_timestamp
    if (!call.start_timestamp) {
      const error = 'Missing start_timestamp';
      console.log(`[SYNC-CALLS-${this.requestId}] VALIDATION ERROR: ${error}`);
      errors.push(error);
    } else {
      console.log(`[SYNC-CALLS-${this.requestId}] ✓ start_timestamp present: ${call.start_timestamp}`);
    }

    // Log additional fields for debugging
    console.log(`[SYNC-CALLS-${this.requestId}] Additional fields:`, {
      agent_id: call.agent_id || 'null',
      call_status: call.call_status || 'null',
      duration_ms: call.duration_ms || 'null',
      from_number: call.from_number || 'null',
      to_number: call.to_number || 'null'
    });

    const isValid = errors.length === 0;
    console.log(`[SYNC-CALLS-${this.requestId}] VALIDATION RESULT: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    return { isValid, errors };
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

  private mapCallData(call: any, userAgent: any, agent: any) {
    const timestamp = call.start_timestamp 
      ? new Date(call.start_timestamp * 1000) 
      : new Date();
    
    const duration = call.duration_sec || (call.duration_ms ? Math.floor(call.duration_ms / 1000) : 0);
    const cost = call.call_cost?.combined_cost || 0;
    const ratePerMinute = 0.17; // Default rate
    const calculatedRevenue = (duration / 60) * ratePerMinute;

    // Set values - NULL allowed when bypassing validation
    const userId = userAgent?.user_id || null;
    const companyId = userAgent?.company_id || agent?.company_id || null;
    const agentId = agent?.id || null;

    console.log(`[SYNC-CALLS-${this.requestId}] Mapping call ${call.call_id}:`);
    console.log(`[SYNC-CALLS-${this.requestId}] - userId: ${userId || 'NULL'}`);
    console.log(`[SYNC-CALLS-${this.requestId}] - companyId: ${companyId || 'NULL'}`);
    console.log(`[SYNC-CALLS-${this.requestId}] - agentId: ${agentId || 'NULL'}`);

    return {
      call_id: call.call_id,
      user_id: userId,
      company_id: companyId,
      agent_id: agentId,
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
