
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
  private readonly apiKey: string;

  constructor() {
    this.apiKey = import.meta.env?.VITE_RETELL_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[RETELL_AGENT_SYNC] No API key provided - sync functionality will be limited');
    }
  }

  /**
   * Test API connection using comprehensive endpoint discovery
   */
  async testConnection(): Promise<any> {
    console.log('[RETELL_AGENT_SYNC] Testing API connection with endpoint discovery...');
    return await retellApiDebugger.testAndDisplayResults();
  }

  /**
   * Ensure user profile exists for the current user
   */
  private async ensureUserProfile(): Promise<{ user: any; error: any }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('[RETELL_AGENT_SYNC] User not authenticated:', authError);
        return { user: null, error: authError || new Error('User not authenticated') };
      }

      // Check if user profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('[RETELL_AGENT_SYNC] Creating user profile for:', user.email);
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
            avatar_url: user.user_metadata?.avatar_url
          });

        if (insertError) {
          console.error('[RETELL_AGENT_SYNC] Error creating user profile:', insertError);
          return { user: null, error: insertError };
        }

        console.log('[RETELL_AGENT_SYNC] User profile created successfully');
      } else if (profileError) {
        console.error('[RETELL_AGENT_SYNC] Error checking user profile:', profileError);
        return { user: null, error: profileError };
      }

      return { user, error: null };
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error in ensureUserProfile:', error);
      return { user: null, error };
    }
  }

  /**
   * Fetch agents from Retell AI API using endpoint discovery
   */
  private async fetchRetellAgents(): Promise<RetellAgent[]> {
    console.log('[RETELL_AGENT_SYNC] Fetching agents using endpoint discovery...');
    
    // Use the API debugger to find working endpoint and fetch agents
    const apiResult = await retellApiDebugger.testAllEndpoints();
    
    if (!apiResult.success) {
      throw new Error(`Failed to find working API endpoint: ${apiResult.error}`);
    }

    console.log('[RETELL_AGENT_SYNC] Using working endpoint:', apiResult.endpoint);
    
    // Extract agents from the response
    let agentsArray = [];
    const responseData = apiResult.response;
    
    if (Array.isArray(responseData)) {
      agentsArray = responseData;
    } else if (responseData?.agents && Array.isArray(responseData.agents)) {
      agentsArray = responseData.agents;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      agentsArray = responseData.data;
    }

    // Filter out null/undefined agents and map to RetellAgent format
    const validAgents = agentsArray.filter((agent: any) => 
      agent && 
      (agent.agent_id || agent.id) && 
      (agent.agent_name || agent.name)
    );

    const retellAgents: RetellAgent[] = validAgents.map((agent: any) => ({
      agent_id: agent.agent_id || agent.id,
      agent_name: agent.agent_name || agent.name || `Agent ${agent.agent_id || agent.id}`,
      voice_id: agent.voice_id,
      voice_model: agent.voice_model,
      language: agent.language,
      response_engine: agent.response_engine,
      llm_websocket_url: agent.llm_websocket_url,
      prompt: agent.prompt,
      boosted_keywords: agent.boosted_keywords,
      ambient_sound: agent.ambient_sound,
      ambient_sound_volume: agent.ambient_sound_volume,
      backchannel_frequency: agent.backchannel_frequency,
      backchannel_words: agent.backchannel_words,
      reminder_trigger_ms: agent.reminder_trigger_ms,
      reminder_max_count: agent.reminder_max_count,
      interruption_sensitivity: agent.interruption_sensitivity,
      enable_transcription_formatting: agent.enable_transcription_formatting,
      opt_out_sensitive_data_storage: agent.opt_out_sensitive_data_storage,
      pronunciation_dictionary: agent.pronunciation_dictionary,
      normalize_for_speech: agent.normalize_for_speech,
      responsiveness: agent.responsiveness,
    }));

    console.log('[RETELL_AGENT_SYNC] Successfully fetched and mapped', retellAgents.length, 'agents');
    return retellAgents;
  }

  /**
   * Map Retell agent to database format
   */
  private mapAgentToDbFormat(retellAgent: RetellAgent) {
    const now = new Date().toISOString();
    
    return {
      agent_id: retellAgent.agent_id,
      retell_agent_id: retellAgent.agent_id,
      name: retellAgent.agent_name,
      description: retellAgent.prompt ? retellAgent.prompt.substring(0, 500) : null,
      voice_model: retellAgent.voice_model,
      avatar_url: null,
      language: retellAgent.language || 'en',
      status: 'active',
      rate_per_minute: 0.17,
      is_active: true,
      created_at: now,
      updated_at: now,
      last_synced: now
    };
  }

  /**
   * Force a sync of agents from Retell AI
   */
  async forceSync(): Promise<AgentSyncResult> {
    console.log('[RETELL_AGENT_SYNC] Starting force sync...');

    // Ensure user profile exists
    const { user, error: userError } = await this.ensureUserProfile();
    if (userError || !user) {
      throw new Error(`Authentication required: ${userError?.message || 'User not found'}`);
    }

    console.log('[RETELL_AGENT_SYNC] ✅ User authenticated:', user.email);

    // Test API connection first
    const connectionTest = await retellApiDebugger.testApiConnection();
    if (!connectionTest.success) {
      console.error('[RETELL_AGENT_SYNC] API connection test failed:', connectionTest);
      throw new Error(`API connection failed: ${connectionTest.error}`);
    }

    console.log('[RETELL_AGENT_SYNC] ✅ API connection test passed');

    const syncStartTime = new Date().toISOString();

    // Create sync stats record
    const { data: syncRecord, error: syncError } = await supabase
      .from('retell_sync_stats')
      .insert({
        sync_status: 'running',
        sync_started_at: syncStartTime
      })
      .select('id, sync_started_at')
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
        existingAgents?.map(agent => agent.agent_id) || []
      );
      const fetchedAgentIds = new Set(
        retellAgents.map(agent => agent.agent_id)
      );

      // Sync each agent
      for (const retellAgent of retellAgents) {
        try {
          const existingAgent = existingAgents?.find(
            agent => agent.agent_id === retellAgent.agent_id
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
        agent => agent.is_active && !fetchedAgentIds.has(agent.agent_id)
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
          console.error('[RETELL_AGENT_SYNC] Error deactivating agent', agent.agent_id, ':', deactivateError);
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
        sync_started_at: syncRecord.sync_started_at || syncStartTime,
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

  async getUnassignedAgents(): Promise<any[]> {
    try {
      console.log('[RETELL_AGENT_SYNC] Fetching unassigned agents...');
      
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
      
      console.log('[RETELL_AGENT_SYNC] Found', unassigned.length, 'unassigned agents');
      return unassigned;
    } catch (error: any) {
      console.error('[RETELL_AGENT_SYNC] Error in getUnassignedAgents:', error);
      throw error;
    }
  }
}

// Helper function to ensure user profile exists
export async function ensureUserProfile(): Promise<{ user: any; error: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[RETELL_AGENT_SYNC] User not authenticated:', authError);
      return { user: null, error: authError || new Error('User not authenticated') };
    }

    // Check if user profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('[RETELL_AGENT_SYNC] Creating user profile for:', user.email);
      
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          avatar_url: user.user_metadata?.avatar_url
        });

      if (insertError) {
        console.error('[RETELL_AGENT_SYNC] Error creating user profile:', insertError);
        return { user: null, error: insertError };
      }

      console.log('[RETELL_AGENT_SYNC] User profile created successfully');
    } else if (profileError) {
      console.error('[RETELL_AGENT_SYNC] Error checking user profile:', profileError);
      return { user: null, error: profileError };
    }

    return { user, error: null };
  } catch (error: any) {
    console.error('[RETELL_AGENT_SYNC] Error in ensureUserProfile:', error);
    return { user: null, error };
  }
}

// Export singleton instance
export const retellAgentSyncService = new RetellAgentSyncService();
