
// Agent processing logic for sync operations

import { mapRetellCallToSupabase } from "./retellDataMapper.ts";
import { RetellApiClient } from "./retellApiClient.ts";
import { SYNC_CONSTANTS } from "./config.ts";

export interface AgentSyncResult {
  agentId: string;
  agentName: string;
  callsProcessed: number;
  callsSynced: number;
  success: boolean;
  error?: string;
}

export class AgentProcessor {
  constructor(
    private supabaseClient: any,
    private retellClient: RetellApiClient,
    private requestId: string
  ) {}

  async processAgent(agent: any, userAgent: any): Promise<AgentSyncResult> {
    const result: AgentSyncResult = {
      agentId: agent.id,
      agentName: agent.name,
      callsProcessed: 0,
      callsSynced: 0,
      success: false
    };

    try {
      console.log(`[SYNC-CALLS-${this.requestId}] Processing agent: ${agent.name} (${agent.retell_agent_id})`);

      let pageToken: string | null = null;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore && totalProcessed < SYNC_CONSTANTS.MAX_CALLS_PER_AGENT) {
        console.log(`[SYNC-CALLS-${this.requestId}] Fetching calls for ${agent.name}, page token: ${pageToken || 'first'}`);

        const responseData = await this.retellClient.fetchCalls(
          agent.retell_agent_id,
          SYNC_CONSTANTS.BATCH_SIZE,
          pageToken || undefined
        );

        const calls = responseData.calls || [];
        hasMore = responseData.has_more || false;
        pageToken = responseData.next_page_token || null;

        console.log(`[SYNC-CALLS-${this.requestId}] Retrieved ${calls.length} calls for ${agent.name}, hasMore: ${hasMore}`);

        // Process each call
        for (const call of calls) {
          try {
            console.log(`[SYNC-CALLS-${this.requestId}] Processing call ${call.call_id} for agent ${agent.name}`);
            
            // Get detailed call information if needed
            let detailedCall = call;
            if (!call.transcript && !call.recording_url) {
              console.log(`[SYNC-CALLS-${this.requestId}] Fetching detailed info for call ${call.call_id}`);
              detailedCall = await this.retellClient.fetchCallDetails(call.call_id);
            }

            const processed = await this.processCall(detailedCall, userAgent, agent);
            result.callsProcessed++;
            totalProcessed++;
            
            if (processed) {
              result.callsSynced++;
              console.log(`[SYNC-CALLS-${this.requestId}] Successfully synced call ${call.call_id}`);
            } else {
              console.log(`[SYNC-CALLS-${this.requestId}] Call ${call.call_id} already exists, skipped`);
            }
          } catch (callError) {
            console.error(`[SYNC-CALLS-${this.requestId}] Error processing call ${call.call_id}:`, callError);
            console.error(`[SYNC-CALLS-${this.requestId}] Call error stack:`, callError.stack);
            result.callsProcessed++;
            totalProcessed++;
          }
        }

        // Add delay to prevent rate limiting
        if (hasMore) {
          console.log(`[SYNC-CALLS-${this.requestId}] Adding rate limit delay...`);
          await new Promise(resolve => setTimeout(resolve, SYNC_CONSTANTS.RATE_LIMIT_DELAY));
        }
      }

      result.success = true;
      console.log(`[SYNC-CALLS-${this.requestId}] Completed agent ${agent.name}: ${result.callsProcessed} calls processed, ${result.callsSynced} synced`);

    } catch (error) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error processing agent ${agent.retell_agent_id}:`, error);
      console.error(`[SYNC-CALLS-${this.requestId}] Agent error stack:`, error.stack);
      result.error = error.message;
    }

    return result;
  }

  private async processCall(call: any, userAgent: any, agent: any): Promise<boolean> {
    console.log(`[SYNC-CALLS-${this.requestId}] Processing call data:`, {
      call_id: call.call_id,
      agent_id: agent.retell_agent_id,
      status: call.call_status,
      duration: call.duration_sec
    });

    // Check if call already exists in retell_calls table
    const { data: existingCall, error: checkError } = await this.supabaseClient
      .from('retell_calls')
      .select('id')
      .eq('call_id', call.call_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`[SYNC-CALLS-${this.requestId}] Error checking existing call:`, checkError);
      throw checkError;
    }

    if (existingCall) {
      console.log(`[SYNC-CALLS-${this.requestId}] Call ${call.call_id} already exists in retell_calls, skipping`);
      return false;
    }

    // Map Retell call data to Supabase format for retell_calls table
    const mappedCall = mapRetellCallToSupabase(
      call,
      userAgent.user_id,
      userAgent.company_id,
      agent.id
    );

    console.log(`[SYNC-CALLS-${this.requestId}] Mapped call data:`, {
      call_id: mappedCall.call_id,
      duration_sec: mappedCall.duration_sec,
      revenue_amount: mappedCall.revenue_amount,
      call_status: mappedCall.call_status,
      from_number: mappedCall.from_number,
      to_number: mappedCall.to_number,
      agent_id: mappedCall.agent_id,
      user_id: mappedCall.user_id,
      company_id: mappedCall.company_id
    });

    // Insert into retell_calls table
    const { data: insertData, error: insertError } = await this.supabaseClient
      .from('retell_calls')
      .insert(mappedCall)
      .select();

    if (insertError) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error inserting call ${call.call_id} into retell_calls:`, insertError);
      console.error(`[SYNC-CALLS-${this.requestId}] Insert error details:`, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }

    console.log(`[SYNC-CALLS-${this.requestId}] Successfully inserted call ${call.call_id} into retell_calls table with ID:`, insertData?.[0]?.id);
    return true;
  }
}
