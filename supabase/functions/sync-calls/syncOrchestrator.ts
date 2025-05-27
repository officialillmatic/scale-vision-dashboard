
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
    console.log(`[SYNC-CALLS-${this.requestId}] Fetching agents with Retell integration...`);
    
    const { data: agents, error: agentsError } = await this.supabaseClient
      .from('agents')
      .select('id, retell_agent_id, rate_per_minute, name')
      .not('retell_agent_id', 'is', null)
      .eq('status', 'active');

    if (agentsError) {
      console.error(`[SYNC-CALLS-${this.requestId}] Error fetching agents:`, agentsError);
      throw new Error(`Failed to fetch agents: ${agentsError.message}`);
    }

    console.log(`[SYNC-CALLS-${this.requestId}] Found ${agents?.length || 0} agents with Retell integration`);

    let totalSynced = 0;
    let totalProcessed = 0;
    let skippedAgents = 0;
    let processedAgents = 0;

    const agentProcessor = new AgentProcessor(this.supabaseClient, this.retellClient, this.requestId);

    for (const agent of agents || []) {
      try {
        // Find user agent mapping for this agent
        const { data: userAgents, error: userAgentError } = await this.supabaseClient
          .from('user_agents')
          .select('user_id, company_id')
          .eq('agent_id', agent.id);

        if (userAgentError) {
          console.error(`[SYNC-CALLS-${this.requestId}] Error fetching user agents for agent ${agent.id}:`, userAgentError);
          continue;
        }

        if (!userAgents || userAgents.length === 0) {
          console.warn(`[SYNC-CALLS-${this.requestId}] No user mapping found for agent ${agent.id}, skipping...`);
          skippedAgents++;
          continue;
        }

        // Use the first user agent mapping
        const userAgent = userAgents[0];
        processedAgents++;

        const result: AgentSyncResult = await agentProcessor.processAgent(agent, userAgent);
        
        totalProcessed += result.callsProcessed;
        totalSynced += result.callsSynced;

      } catch (error) {
        console.error(`[SYNC-CALLS-${this.requestId}] Error processing agent ${agent.retell_agent_id}:`, error);
      }
    }

    return {
      message: 'Sync completed successfully',
      synced_calls: totalSynced,
      processed_calls: totalProcessed,
      agents_processed: processedAgents,
      agents_found: agents?.length || 0,
      skipped_agents: skippedAgents,
      requestId: this.requestId,
      timestamp: new Date().toISOString()
    };
  }

  async performTest(): Promise<any> {
    const testData = await this.retellClient.testConnectivity(this.requestId);
    console.log(`[SYNC-CALLS-${this.requestId}] Test successful - API connectivity verified`);
    
    return {
      message: 'Retell API connectivity test passed',
      callsFound: testData?.calls?.length || 0,
      hasMore: testData?.has_more || false,
      requestId: this.requestId
    };
  }
}
