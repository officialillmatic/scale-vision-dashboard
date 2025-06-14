import { debugLog } from "@/lib/debug";

import { supabase } from "@/integrations/supabase/client";

export interface RetellAgent {
  id: string;
  retell_agent_id: string;
  agent_id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  rate_per_minute?: number;
  voice_id?: string;
  voice_model?: string;
  language?: string;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
  is_active: boolean;
}

export const fetchRetellAgents = async (): Promise<RetellAgent[]> => {
  try {
    debugLog('🔍 [fetchRetellAgents] Fetching agents from retell_agents table');
    
    const { data, error } = await supabase
      .from("retell_agents")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("[RETELL_AGENT_SERVICE] Error fetching retell agents:", error);
      throw error;
    }

    debugLog('🔍 [fetchRetellAgents] Raw data received:', data);
    debugLog('🔍 [fetchRetellAgents] Number of agents:', data?.length || 0);

    return data || [];
  } catch (error: any) {
    console.error("[RETELL_AGENT_SERVICE] Error in fetchRetellAgents:", error);
    throw new Error(`Failed to fetch retell agents: ${error.message}`);
  }
};

export const fetchRetellAgentById = async (id: string): Promise<RetellAgent | null> => {
  try {
    const { data, error } = await supabase
      .from("retell_agents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[RETELL_AGENT_SERVICE] Error fetching retell agent by id:", error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error("[RETELL_AGENT_SERVICE] Error in fetchRetellAgentById:", error);
    throw new Error(`Failed to fetch retell agent: ${error.message}`);
  }
};
