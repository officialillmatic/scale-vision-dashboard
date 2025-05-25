
import { supabase } from "@/integrations/supabase/client";
import { AgentsTable } from "@/types/supabase";

export type Agent = AgentsTable & {
  retell_agent_id?: string;
};

export const fetchAgents = async (companyId: string): Promise<Agent[]> => {
  console.log("[AGENT_SERVICE] Fetching agents for company:", companyId);
  
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("name");

    if (error) {
      console.error("[AGENT_SERVICE] Database error:", error);
      throw error;
    }

    console.log("[AGENT_SERVICE] Successfully fetched", data?.length || 0, "agents");
    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchAgents:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};

export const fetchUserAccessibleAgents = async (userId: string, companyId: string): Promise<Agent[]> => {
  console.log("[AGENT_SERVICE] Fetching user accessible agents for user:", userId, "company:", companyId);
  
  try {
    const { data, error } = await supabase.rpc('get_user_accessible_agents', {
      p_user_id: userId,
      p_company_id: companyId
    });

    if (error) {
      console.error("[AGENT_SERVICE] Database error:", error);
      throw error;
    }

    console.log("[AGENT_SERVICE] Successfully fetched", data?.length || 0, "accessible agents");
    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAccessibleAgents:", error);
    throw new Error(`Failed to fetch accessible agents: ${error.message}`);
  }
};

export const createAgent = async (agentData: Partial<Agent>): Promise<Agent | null> => {
  try {
    const { data, error } = await supabase
      .from("agents")
      .insert([agentData])
      .select()
      .single();

    if (error) {
      console.error("[AGENT_SERVICE] Error creating agent:", error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in createAgent:", error);
    throw new Error(`Failed to create agent: ${error.message}`);
  }
};

export const updateAgent = async (agentId: string, updates: Partial<Agent>): Promise<Agent | null> => {
  try {
    const { data, error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", agentId)
      .select()
      .single();

    if (error) {
      console.error("[AGENT_SERVICE] Error updating agent:", error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in updateAgent:", error);
    throw new Error(`Failed to update agent: ${error.message}`);
  }
};

export const deleteAgent = async (agentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", agentId);

    if (error) {
      console.error("[AGENT_SERVICE] Error deleting agent:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in deleteAgent:", error);
    throw new Error(`Failed to delete agent: ${error.message}`);
  }
};

export const fetchCompanyUserAgents = async (companyId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('get_company_user_agents', {
      p_company_id: companyId
    });

    if (error) {
      console.error("[AGENT_SERVICE] Error fetching company user agents:", error);
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchCompanyUserAgents:", error);
    throw new Error(`Failed to fetch company user agents: ${error.message}`);
  }
};

export const assignAgentToUser = async (userId: string, agentId: string, companyId: string, isPrimary: boolean = false): Promise<void> => {
  try {
    const { error } = await supabase
      .from("user_agents")
      .insert([{
        user_id: userId,
        agent_id: agentId,
        company_id: companyId,
        is_primary: isPrimary
      }]);

    if (error) {
      console.error("[AGENT_SERVICE] Error assigning agent to user:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in assignAgentToUser:", error);
    throw new Error(`Failed to assign agent to user: ${error.message}`);
  }
};

export const removeAgentFromUser = async (userId: string, agentId: string, companyId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("user_agents")
      .delete()
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .eq("company_id", companyId);

    if (error) {
      console.error("[AGENT_SERVICE] Error removing agent from user:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in removeAgentFromUser:", error);
    throw new Error(`Failed to remove agent from user: ${error.message}`);
  }
};
