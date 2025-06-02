
import { supabase } from '@/lib/supabase';

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
    this.apiKey = import.meta.env.VITE_RETELL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[RETELL_AGENT_SYNC] No API key provided');
    }
  }

  /**
   * Force a sync of agents from Retell AI
   */
  async forceSync(): Promise<AgentSyncResult> {
    console.log('[RETELL_AGENT_SYNC] Starting force sync...');

    try {
      // Call the Supabase edge function for agent sync
      const { data, error } = await supabase.functions.invoke('retell-agent-sync', {
        method: 'POST',
        body: { force: true }
      });

      if (error) {
        console.error('[RETELL_AGENT_SYNC] Sync failed:', error);
        throw new Error(`Sync failed: ${error.message}`);
      }

      console.log('[RETELL_AGENT_SYNC] Sync completed successfully:', data);
      return data;
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error during sync:', error);
      throw new Error(`Agent sync failed: ${error.message}`);
    }
  }

  /**
   * Get the latest sync statistics
   */
  async getSyncStats(limit: number = 10): Promise<SyncStats[]> {
    try {
      const { data, error } = await supabase
        .from('retell_sync_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[RETELL_AGENT_SYNC] Error fetching sync stats:', error);
        throw new Error(`Failed to fetch sync stats: ${error.message}`);
      }

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
      const { data, error } = await supabase
        .from('retell_agents')
        .select('*')
        .eq('is_active', true)
        .not('retell_agent_id', 'in', 
          supabase
            .from('user_agent_assignments')
            .select('agent_id')
        );

      if (error) {
        console.error('[RETELL_AGENT_SYNC] Error fetching unassigned agents:', error);
        throw new Error(`Failed to fetch unassigned agents: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error in getUnassignedAgents:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const retellAgentSyncService = new RetellAgentSyncService();
