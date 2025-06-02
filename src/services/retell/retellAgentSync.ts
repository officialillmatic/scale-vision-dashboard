
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export interface SyncStats {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  total_agents_fetched: number;
  agents_created: number;
  agents_updated: number;
  agents_deactivated: number;
  sync_status: 'running' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

export class RetellAgentSyncService {
  private readonly retellApiKey: string;
  private readonly retellApiUrl = 'https://api.retellai.com/v2';

  constructor(apiKey?: string) {
    this.retellApiKey = apiKey || import.meta.env.VITE_RETELL_API_KEY;
    
    if (!this.retellApiKey) {
      console.warn('[RETELL_SYNC] No Retell API key provided');
    }
  }

  /**
   * Fetch agents from Retell API
   */
  private async fetchRetellAgents(): Promise<RetellAgent[]> {
    console.log('[RETELL_SYNC] Fetching agents from Retell API...');
    
    if (!this.retellApiKey) {
      throw new Error('Retell API key is required');
    }

    try {
      const response = await fetch(`${this.retellApiUrl}/list-agents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.retellApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: 100 })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Retell API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[RETELL_SYNC] Fetched', data?.agents?.length || 0, 'agents from Retell API');
      
      return data.agents || [];
    } catch (error) {
      console.error('[RETELL_SYNC] Error fetching agents from Retell API:', error);
      throw error;
    }
  }

  /**
   * Start a new sync session and track stats
   */
  private async createSyncStats(): Promise<string> {
    console.log('[RETELL_SYNC] Creating sync stats record...');
    
    const { data, error } = await supabase
      .from('retell_sync_stats')
      .insert({
        sync_status: 'running'
      })
      .select('id')
      .single();

    if (error) {
      console.error('[RETELL_SYNC] Error creating sync stats:', error);
      throw new Error(`Failed to create sync stats: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Update sync stats
   */
  private async updateSyncStats(
    syncId: string, 
    updates: Partial<Omit<SyncStats, 'id' | 'created_at' | 'sync_started_at'>>
  ): Promise<void> {
    console.log('[RETELL_SYNC] Updating sync stats:', updates);
    
    const { error } = await supabase
      .from('retell_sync_stats')
      .update(updates)
      .eq('id', syncId);

    if (error) {
      console.error('[RETELL_SYNC] Error updating sync stats:', error);
    }
  }

  /**
   * Sync agents from Retell to database
   */
  async syncAgents(): Promise<SyncStats> {
    console.log('[RETELL_SYNC] Starting agent synchronization...');
    
    const syncId = await this.createSyncStats();
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

      await this.updateSyncStats(syncId, {
        total_agents_fetched: stats.total_agents_fetched
      });

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

          const agentData = {
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

          if (existingAgent) {
            // Update existing agent
            const { error: updateError } = await supabase
              .from('retell_agents')
              .update(agentData)
              .eq('id', existingAgent.id);

            if (updateError) {
              console.error(`[RETELL_SYNC] Error updating agent ${retellAgent.agent_id}:`, updateError);
            } else {
              stats.agents_updated++;
              console.log(`[RETELL_SYNC] Updated agent: ${retellAgent.agent_name}`);
            }
          } else {
            // Create new agent
            const { error: insertError } = await supabase
              .from('retell_agents')
              .insert(agentData);

            if (insertError) {
              console.error(`[RETELL_SYNC] Error creating agent ${retellAgent.agent_id}:`, insertError);
            } else {
              stats.agents_created++;
              console.log(`[RETELL_SYNC] Created agent: ${retellAgent.agent_name}`);
            }
          }
        } catch (agentError) {
          console.error(`[RETELL_SYNC] Error processing agent ${retellAgent.agent_id}:`, agentError);
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
          console.error(`[RETELL_SYNC] Error deactivating agent ${agent.retell_agent_id}:`, deactivateError);
        } else {
          stats.agents_deactivated++;
          console.log(`[RETELL_SYNC] Deactivated agent: ${agent.name}`);
        }
      }

      // Update final sync stats
      await this.updateSyncStats(syncId, {
        ...stats,
        sync_status: 'completed',
        sync_completed_at: new Date().toISOString()
      });

      console.log('[RETELL_SYNC] Synchronization completed successfully:', stats);
      toast.success(`Sync completed: ${stats.agents_created} created, ${stats.agents_updated} updated, ${stats.agents_deactivated} deactivated`);

      // Return the completed sync stats
      const { data: finalStats } = await supabase
        .from('retell_sync_stats')
        .select('*')
        .eq('id', syncId)
        .single();

      return finalStats as SyncStats;

    } catch (error: any) {
      console.error('[RETELL_SYNC] Synchronization failed:', error);
      
      await this.updateSyncStats(syncId, {
        sync_status: 'failed',
        error_message: error.message,
        sync_completed_at: new Date().toISOString()
      });

      toast.error(`Sync failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unassigned Retell agents (not linked to any user_agents)
   */
  async getUnassignedAgents(): Promise<any[]> {
    console.log('[RETELL_SYNC] Fetching unassigned agents...');
    
    try {
      const { data, error } = await supabase
        .from('retell_agents')
        .select(`
          *,
          user_agents!left(id)
        `)
        .eq('is_active', true);

      if (error) {
        console.error('[RETELL_SYNC] Error fetching unassigned agents:', error);
        throw new Error(`Failed to fetch unassigned agents: ${error.message}`);
      }

      // Filter agents that have no user_agents associations
      const unassignedAgents = (data || []).filter(agent => 
        !agent.user_agents || agent.user_agents.length === 0
      );

      console.log('[RETELL_SYNC] Found', unassignedAgents.length, 'unassigned agents');
      return unassignedAgents;
    } catch (error) {
      console.error('[RETELL_SYNC] Error getting unassigned agents:', error);
      throw error;
    }
  }

  /**
   * Get recent sync statistics
   */
  async getSyncStats(limit: number = 10): Promise<SyncStats[]> {
    console.log('[RETELL_SYNC] Fetching sync statistics...');
    
    try {
      const { data, error } = await supabase
        .from('retell_sync_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[RETELL_SYNC] Error fetching sync stats:', error);
        throw new Error(`Failed to fetch sync stats: ${error.message}`);
      }

      return data as SyncStats[];
    } catch (error) {
      console.error('[RETELL_SYNC] Error getting sync stats:', error);
      throw error;
    }
  }

  /**
   * Force a manual sync (can be called from UI)
   */
  async forceSync(): Promise<SyncStats> {
    console.log('[RETELL_SYNC] Manual sync initiated...');
    toast.info('Starting Retell agent synchronization...');
    
    return await this.syncAgents();
  }
}

// Export singleton instance
export const retellAgentSyncService = new RetellAgentSyncService();
