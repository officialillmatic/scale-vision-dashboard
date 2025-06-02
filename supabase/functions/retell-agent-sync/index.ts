
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

interface RetellAgent {
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

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[RETELL-SYNC-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const retellApiKey = Deno.env.get('RETELL_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !retellApiKey) {
      console.error(`[RETELL-SYNC-${requestId}] Missing required environment variables`);
      return createErrorResponse('Missing required environment variables', 500);
    }

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      console.log(`[RETELL-SYNC-${requestId}] Starting Retell agent synchronization...`);

      // Create sync stats record
      const { data: syncRecord, error: syncError } = await supabaseClient
        .from('retell_sync_stats')
        .insert({
          sync_status: 'running'
        })
        .select('id')
        .single();

      if (syncError) {
        console.error(`[RETELL-SYNC-${requestId}] Error creating sync record:`, syncError);
        return createErrorResponse(`Failed to create sync record: ${syncError.message}`, 500);
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
        console.log(`[RETELL-SYNC-${requestId}] Fetching agents from Retell API...`);
        
        const retellResponse = await fetch('https://api.retellai.com/v2/list-agents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ limit: 100 })
        });

        if (!retellResponse.ok) {
          const errorText = await retellResponse.text();
          throw new Error(`Retell API error: ${retellResponse.status} - ${errorText}`);
        }

        const retellData = await retellResponse.json();
        const retellAgents: RetellAgent[] = retellData.agents || [];
        stats.total_agents_fetched = retellAgents.length;

        console.log(`[RETELL-SYNC-${requestId}] Fetched ${retellAgents.length} agents from Retell API`);

        // Update sync stats with fetched count
        await supabaseClient
          .from('retell_sync_stats')
          .update({ total_agents_fetched: stats.total_agents_fetched })
          .eq('id', syncId);

        // Get existing agents from database
        const { data: existingAgents, error: fetchError } = await supabaseClient
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
              const { error: updateError } = await supabaseClient
                .from('retell_agents')
                .update(agentData)
                .eq('id', existingAgent.id);

              if (updateError) {
                console.error(`[RETELL-SYNC-${requestId}] Error updating agent ${retellAgent.agent_id}:`, updateError);
              } else {
                stats.agents_updated++;
                console.log(`[RETELL-SYNC-${requestId}] Updated agent: ${retellAgent.agent_name}`);
              }
            } else {
              // Create new agent
              const { error: insertError } = await supabaseClient
                .from('retell_agents')
                .insert(agentData);

              if (insertError) {
                console.error(`[RETELL-SYNC-${requestId}] Error creating agent ${retellAgent.agent_id}:`, insertError);
              } else {
                stats.agents_created++;
                console.log(`[RETELL-SYNC-${requestId}] Created agent: ${retellAgent.agent_name}`);
              }
            }
          } catch (agentError) {
            console.error(`[RETELL-SYNC-${requestId}] Error processing agent ${retellAgent.agent_id}:`, agentError);
          }
        }

        // Deactivate agents that are no longer in Retell
        const agentsToDeactivate = existingAgents?.filter(
          agent => agent.is_active && !fetchedAgentIds.has(agent.retell_agent_id)
        ) || [];

        for (const agent of agentsToDeactivate) {
          const { error: deactivateError } = await supabaseClient
            .from('retell_agents')
            .update({ 
              is_active: false, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', agent.id);

          if (deactivateError) {
            console.error(`[RETELL-SYNC-${requestId}] Error deactivating agent ${agent.retell_agent_id}:`, deactivateError);
          } else {
            stats.agents_deactivated++;
            console.log(`[RETELL-SYNC-${requestId}] Deactivated agent: ${agent.name}`);
          }
        }

        // Update final sync stats
        await supabaseClient
          .from('retell_sync_stats')
          .update({
            ...stats,
            sync_status: 'completed',
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', syncId);

        console.log(`[RETELL-SYNC-${requestId}] Synchronization completed successfully:`, stats);

        return createSuccessResponse({
          message: 'Retell agent synchronization completed successfully',
          stats,
          requestId
        });

      } catch (error: any) {
        console.error(`[RETELL-SYNC-${requestId}] Synchronization failed:`, error);
        
        // Update sync stats with error
        await supabaseClient
          .from('retell_sync_stats')
          .update({
            sync_status: 'failed',
            error_message: error.message,
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', syncId);

        return createErrorResponse(`Synchronization failed: ${error.message}`, 500);
      }
    }

    return createErrorResponse('Method not allowed - only POST requests supported', 405);

  } catch (error: any) {
    console.error(`[RETELL-SYNC-${requestId}] Fatal error:`, error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
