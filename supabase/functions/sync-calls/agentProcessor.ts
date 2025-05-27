
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

      while (hasMore) {
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
            const processed = await this.processCall(call, userAgent, agent);
            result.callsProcessed++;
            if (processed) {
              result.callsSynced++;
            }
          } catch (callError) {
            console.error(`[SYNC-CALLS-${this.requestId}] Error processing call ${call.call_id}:`, callError);
            result.callsProcessed++;
          }
        }

        // Add delay to prevent rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, SYNC_CONSTANTS.RATE_LIMIT_DELAY));
        }
      }

      result.success = true;
      console.log(`[SYNC-CALLS-${this.requestId}] Completed agent ${agent.name}: ${result.callsProcessed} calls processed, ${result.callsSynced} synced`);

    } catch (error) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error processing agent ${agent.retell_agent_id}:`, error);
      result.error = error.message;
    }

    return result;
  }

  private async processCall(call: any, userAgent: any, agent: any): Promise<boolean> {
    // Check if call already exists
    const { data: existingCall } = await this.supabaseClient
      .from('calls')
      .select('id')
      .eq('call_id', call.call_id)
      .single();

    if (existingCall) {
      console.log(`[SYNC-CALLS-${this.requestId}] Call ${call.call_id} already exists, skipping`);
      return false;
    }

    // Map Retell call data to Supabase format
    const mappedCall = mapRetellCallToSupabase(
      call,
      userAgent.user_id,
      userAgent.company_id,
      agent.id
    );

    // Upsert the call
    const { error: upsertError } = await this.supabaseClient
      .from('calls')
      .upsert(mappedCall, {
        onConflict: 'call_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error upserting call ${call.call_id}:`, upsertError);
      throw upsertError;
    }

    return true;
  }
}
