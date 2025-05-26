
import { supabase } from "@/integrations/supabase/client";
import { AgentTable } from "@/types/supabase";

export type Agent = AgentTable & {
  ai_agent_id?: string;
};

export type UserAgent = {
  id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  agent?: Agent;
  user_details?: {
    email: string;
    name?: string;
  };
};

export const fetchAgents = async (companyId?: string): Promise<Agent[]> => {
  console.log("[AGENT_SERVICE] Fetching agents for company:", companyId);
  
  try {
    let query = supabase
      .from("agents")
      .select("*")
      .order("name");

    const { data, error } = await query;

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

export const fetchUserAgents = async (companyId?: string): Promise<UserAgent[]> => {
  console.log("[AGENT_SERVICE] Fetching user agents for company:", companyId);
  
  try {
    let query = supabase
      .from("user_agents")
      .select(`
        *,
        agent:agents(*),
        user_details:user_profiles(email, name)
      `)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[AGENT_SERVICE] Database error:", error);
      throw error;
    }

    console.log("[AGENT_SERVICE] Successfully fetched", data?.length || 0, "user agents");
    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAgents:", error);
    throw new Error(`Failed to fetch user agents: ${error.message}`);
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

export const deleteAgent = async (agentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", agentId);

    if (error) {
      console.error("[AGENT_SERVICE] Error deleting agent:", error);
      throw error;
    }
    
    return true;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in deleteAgent:", error);
    throw new Error(`Failed to delete agent: ${error.message}`);
  }
};

export const fetchCompanyUserAgents = async (companyId: string): Promise<any[]> => {
  try {
    // Use the secure function that respects RLS policies
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

export const assignAgentToUser = async (userAgentData: Partial<UserAgent>): Promise<UserAgent | null> => {
  try {
    const { data, error } = await supabase
      .from("user_agents")
      .insert([userAgentData])
      .select()
      .single();

    if (error) {
      console.error("[AGENT_SERVICE] Error assigning agent to user:", error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in assignAgentToUser:", error);
    throw new Error(`Failed to assign agent to user: ${error.message}`);
  }
};

export const removeAgentFromUser = async (userAgentId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_agents")
      .delete()
      .eq("id", userAgentId);

    if (error) {
      console.error("[AGENT_SERVICE] Error removing agent from user:", error);
      throw error;
    }
    
    return true;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in removeAgentFromUser:", error);
    throw new Error(`Failed to remove agent from user: ${error.message}`);
  }
};
