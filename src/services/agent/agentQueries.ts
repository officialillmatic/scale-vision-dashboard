
import { supabase } from "@/integrations/supabase/client";
import { Agent, UserAgent } from "./agentTypes";

export const fetchAgents = async (companyId?: string): Promise<Agent[]> => {
  try {
    let query = supabase
      .from("agents")
      .select("*")
      .eq("status", "active");

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AGENT_SERVICE] Error fetching agents:", error);
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchAgents:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};

export const fetchUserAgents = async (companyId?: string): Promise<UserAgent[]> => {
  try {
    let query = supabase
      .from("user_agents")
      .select(`
        *,
        agent:agents(*),
        user_details:user_profiles(id, email, name, avatar_url)
      `);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AGENT_SERVICE] Error fetching user agents:", error);
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAgents:", error);
    throw new Error(`Failed to fetch user agents: ${error.message}`);
  }
};

export const fetchUserAccessibleAgents = async (userId: string, companyId?: string): Promise<Agent[]> => {
  try {
    let query = supabase
      .from("user_agents")
      .select(`
        agent:agents(*)
      `)
      .eq("user_id", userId);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[AGENT_SERVICE] Error fetching user accessible agents:", error);
      throw error;
    }

    // Extract agents from the nested structure
    return data?.map(item => item.agent).filter(Boolean) || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAccessibleAgents:", error);
    throw new Error(`Failed to fetch user accessible agents: ${error.message}`);
  }
};

export const fetchCompanyUserAgents = async (companyId: string): Promise<UserAgent[]> => {
  try {
    const { data, error } = await supabase
      .from("user_agents")
      .select(`
        *,
        agent:agents(*),
        user_details:user_profiles(id, email, name, avatar_url)
      `)
      .eq("company_id", companyId);

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
