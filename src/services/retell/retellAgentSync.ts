
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

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
  voice_id?: string;
  voice_model?: string;
  language?: string;
  response_engine?: string;
  llm_websocket_url?: string;
  prompt?: string;
  boosted_keywords?: string[];
  ambient_sound?: string;
  ambient_sound_volume?: number;
  backchannel_frequency?: number;
  backchannel_words?: string[];
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
  interruption_sensitivity?: number;
  enable_transcription_formatting?: boolean;
  opt_out_sensitive_data_storage?: boolean;
  pronunciation_dictionary?: any;
  normalize_for_speech?: boolean;
  responsiveness?: number;
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
   * Fetch agents from Retell AI API
   */
  private async fetchRetellAgents(): Promise<RetellAgent[]> {
    console.log('[RETELL_AGENT_SYNC] Fetching agents from Retell API...');
    
    const response = await fetch(`${this.baseUrl}/list-agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ limit: 100 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retell API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.agents || [];
  }

  /**
   * Map Retell agent to database format
   */
  private mapAgentToDbFormat(retellAgent: RetellAgent) {
    return {
      retell_agent_id: retellAgent.agent_id,
      name: retellAgent.agent_name,
      voice_id: retellAgent.voice_id,
      voice_model: retellAgent.voice_model,
      language: retellAgent.language || 'en-US',
      response_engine: retellAgent.response_engine,
      llm_websocket_url: retellAgent.llm_websocket_url,
      prompt: retellAgent.prompt,
      boosted_keywords: retellAgent.boosted_keywords,
      ambient_sound: retellAgent.ambient_sound,
      ambient_sound_volume: retellAgent.ambient_sound_volume,
      backchannel_frequency: retellAgent.backchannel_frequency,
      backchannel_words: retellAgent.backchannel_words,
      reminder_trigger_ms: retellAgent.reminder_trigger_ms,
      reminder_max_count: retellAgent.reminder_max_count,
      interruption_sensitivity: retellAgent.interruption_sensitivity,
      enable_transcription_formatting: retellAgent.enable_transcription_formatting,
      opt_out_sensitive_data_storage: retellAgent.opt_out_sensitive_data_storage,
      pronunciation_dictionary: retellAgent.pronunciation_dictionary,
      normalize_for_speech: retellAgent.normalize_for_speech,
      responsiveness: retellAgent.responsiveness,
      is_active: true,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
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

    // Create sync stats record
    const { data: syncRecord, error: syncError } = await supabase
      .from('retell_sync_stats')
      .insert({
        sync_status: 'running'
      })
      .select('id')
      .single();

    if (syncError) {
      console.error('[RETELL_AGENT_SYNC] Error creating sync record:', syncError);
      throw new Error(`Failed to create sync record: ${syncError.message}`);
    }

    const syncId = syncRecord.id;
    let stats = {
      total_agents_fetched: 0,
      agents_created: 0,
      agents_updated: 0,
      agents_deactivated: 0
    };

    try {
      // Fetch agents from Retell API
      const retellAgents = await this.fetchRetellAgents();
      stats.total_agents_fetched = retellAgents.length;

      console.log('[RETELL_AGENT_SYNC] Fetched', retellAgents.length, 'agents from Retell API');

      // Update sync stats with fetched count
      await supabase
        .from('retell_sync_stats')
        .update({ total_agents_fetched: stats.total_agents_fetched })
        .eq('id', syncId);

      // Get existing agents from database
      const { data: existingAgents, error: fetchError } = await supabase
        .from('retell_agents')
        .select('*');

      if (fetchError) {
        throw new Error(`Failed to fetch existing agents: ${fetchError.message}`);
      }

      const existingAgentIds = new Set(
        existingAgents?.map(agent => agent.retell_agent_id) || []
      );
      const fetchedAgentIds = new Set(
        retellAgents.map(agent => agent.agent_id)
      );

      // Sync each agent
      for (const retellAgent of retellAgents) {
        try {
          const existingAgent = existingAgents?.find(
            agent => agent.retell_agent_id === retellAgent.agent_id
          );

          const agentData = this.mapAgentToDbFormat(retellAgent);

          if (existingAgent) {
            // Update existing agent
            const { error: updateError } = await supabase
              .from('retell_agents')
              .update(agentData)
              .eq('id', existingAgent.id);

            if (updateError) {
              console.error('[RETELL_AGENT_SYNC] Error updating agent', retellAgent.agent_id, ':', updateError);
            } else {
              stats.agents_updated++;
              console.log('[RETELL_AGENT_SYNC] Updated agent:', retellAgent.agent_name);
            }
          } else {
            // Create new agent
            const { error: insertError } = await supabase
              .from('retell_agents')
              .insert(agentData);

            if (insertError) {
              console.error('[RETELL_AGENT_SYNC] Error creating agent', retellAgent.agent_id, ':', insertError);
            } else {
              stats.agents_created++;
              console.log('[RETELL_AGENT_SYNC] Created agent:', retellAgent.agent_name);
            }
          }
        } catch (agentError) {
          console.error('[RETELL_AGENT_SYNC] Error processing agent', retellAgent.agent_id, ':', agentError);
        }
      }

      // Deactivate agents that are no longer in Retell
      const agentsToDeactivate = existingAgents?.filter(
        agent => agent.is_active && !fetchedAgentIds.has(agent.retell_agent_id)
      ) || [];

      for (const agent of agentsToDeactivate) {
        const { error: deactivateError } = await supabase
          .from('retell_agents')
          .update({ 
            is_active: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', agent.id);

        if (deactivateError) {
          console.error('[RETELL_AGENT_SYNC] Error deactivating agent', agent.retell_agent_id, ':', deactivateError);
        } else {
          stats.agents_deactivated++;
          console.log('[RETELL_AGENT_SYNC] Deactivated agent:', agent.name);
        }
      }

      // Update final sync stats
      const completedAt = new Date().toISOString();
      await supabase
        .from('retell_sync_stats')
        .update({
          ...stats,
          sync_status: 'completed',
          sync_completed_at: completedAt
        })
        .eq('id', syncId);

      console.log('[RETELL_AGENT_SYNC] Synchronization completed successfully:', stats);

      return {
        ...stats,
        sync_status: 'completed',
        sync_started_at: syncRecord.sync_started_at || new Date().toISOString(),
        sync_completed_at: completedAt
      };

    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Synchronization failed:', error);
      
      // Update sync stats with error
      await supabase
        .from('retell_sync_stats')
        .update({
          sync_status: 'failed',
          error_message: error.message,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncId);

      throw new Error(`Agent sync failed: ${error.message}`);
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
