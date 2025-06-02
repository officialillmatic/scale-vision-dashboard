
import { supabase } from '@/lib/supabase';
import { retellApiDebugger } from './retellApiDebugger';

export interface AgentSyncResult {
  total_agents_fetched: number;
  agents_created: number;
  agents_updated: number;
  agents_deactivated: number;
  sync_status: string;
  sync_started_at: string;
  sync_completed_at: string;
}

export interface SyncStats {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  sync_status: string;
  total_agents_fetched: number;
  agents_created: number;
  agents_updated: number;
  agents_deactivated: number;
  error_message: string | null;
  created_at: string;
}

class RetellAgentSyncService {
  private readonly baseUrl = 'https://api.retellai.com/v2';
  private readonly apiKey: string;

  constructor() {
    // Check for API key in environment
    this.apiKey = import.meta.env?.VITE_RETELL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[RETELL_AGENT_SYNC] No API key provided - sync functionality will be limited');
    }
  }

  /**
   * Test API connection and environment setup
   */
  async testConnection(): Promise<any> {
    console.log('[RETELL_AGENT_SYNC] Testing API connection...');
    return await retellApiDebugger.testAndDisplayResults();
  }

  /**
   * Force a sync of agents from Retell AI
   */
  async forceSync(): Promise<AgentSyncResult> {
    console.log('[RETELL_AGENT_SYNC] Starting force sync...');

    // First test the API connection
    const connectionTest = await retellApiDebugger.testApiConnection();
    if (!connectionTest.success) {
      console.error('[RETELL_AGENT_SYNC] API connection test failed:', connectionTest);
      throw new Error(`API connection failed: ${connectionTest.error} (Status: ${connectionTest.status})`);
    }

    console.log('[RETELL_AGENT_SYNC] ✅ API connection test passed, proceeding with sync...');

    try {
      // Call the Supabase edge function for agent sync
      console.log('[RETELL_AGENT_SYNC] Calling Supabase edge function...');
      
      const { data, error } = await supabase.functions.invoke('retell-agent-sync', {
        method: 'POST',
        body: { force: true }
      });

      if (error) {
        console.error('[RETELL_AGENT_SYNC] Supabase edge function error:', error);
        throw new Error(`Sync failed: ${error.message}`);
      }

      console.log('[RETELL_AGENT_SYNC] Sync completed successfully:', data);
      return data;
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error during sync:', error);
      throw new Error(`Agent sync failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the latest sync statistics
   */
  async getSyncStats(limit: number = 10): Promise<SyncStats[]> {
    try {
      console.log('[RETELL_AGENT_SYNC] Fetching sync stats...');
      
      const { data, error } = await supabase
        .from('retell_sync_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[RETELL_AGENT_SYNC] Error fetching sync stats:', error);
        throw new Error(`Failed to fetch sync stats: ${error.message}`);
      }

      console.log('[RETELL_AGENT_SYNC] Fetched', data?.length || 0, 'sync stats records');
      return data || [];
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error in getSyncStats:', error);
      throw error;
    }
  }

  /**
   * Get unassigned agents
   */
  async getUnassignedAgents(): Promise<any[]> {
    try {
      console.log('[RETELL_AGENT_SYNC] Fetching unassigned agents...');
      
      // First try to get unassigned agents using a subquery approach
      const { data, error } = await supabase
        .from('retell_agents')
        .select(`
          *,
          user_agent_assignments!left(id)
        `)
        .eq('is_active', true)
        .is('user_agent_assignments.id', null);

      if (error) {
        console.warn('[RETELL_AGENT_SYNC] Subquery approach failed, trying alternative:', error);
        
        // Fallback: Get all active agents and filter client-side
        const { data: allAgents, error: allAgentsError } = await supabase
          .from('retell_agents')
          .select('*')
          .eq('is_active', true);

        if (allAgentsError) {
          console.error('[RETELL_AGENT_SYNC] Error fetching agents:', allAgentsError);
          throw new Error(`Failed to fetch unassigned agents: ${allAgentsError.message}`);
        }

        const { data: assignments } = await supabase
          .from('user_agent_assignments')
          .select('agent_id');

        const assignedAgentIds = new Set((assignments || []).map(a => a.agent_id));
        
        const unassigned = (allAgents || []).filter(agent => 
          !assignedAgentIds.has(agent.retell_agent_id)
        );
        
        console.log('[RETELL_AGENT_SYNC] Found', unassigned.length, 'unassigned agents (fallback method)');
        return unassigned;
      }

      console.log('[RETELL_AGENT_SYNC] Found', data?.length || 0, 'unassigned agents');
      return data || [];
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error in getUnassignedAgents:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const retellAgentSyncService = new RetellAgentSyncService();
