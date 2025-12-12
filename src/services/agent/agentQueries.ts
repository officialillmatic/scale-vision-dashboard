import { supabase } from "@/integrations/supabase/client";
import { safeSupabaseRequest } from "@/integrations/supabase/safe-request";
import { Agent, UserAgent } from "./agentTypes";

export const fetchAgents = async (companyId?: string): Promise<Agent[]> => {
  try {
    console.log('🔍 [fetchAgents] Called with companyId:', companyId);
    
    // TEMPORAL: Sin filtro de company_id para debugging
    const { data, error } = await safeSupabaseRequest(
      supabase
        .from("agents")
        .select("*")
        .eq("status", "active")
    );
      // COMENTAR TEMPORALMENTE: .eq("company_id", companyId);
    
    console.log('🔍 [fetchAgents] Raw data from agents table:', data);
    console.log('🔍 [fetchAgents] Count of agents:', data?.length);
    
    // Log detallado de cada agente
    if (data && data.length > 0) {
      data.forEach((agent, index) => {
        console.log(`🔍 [fetchAgents] Agent ${index + 1}:`, {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          company_id: agent.company_id,
          retell_agent_id: agent.retell_agent_id
        });
      });
    }
    
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
        agent:agents!inner(*),
        user_details:user_profiles!inner(id, email, name, avatar_url)
      `);
    
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    console.log('🔍 [fetchUserAgents] Executing query with company_id:', companyId);
    const { data, error } = await safeSupabaseRequest(query);
    
    if (error) {
      console.error("[AGENT_SERVICE] Error fetching user agents:", error);
      throw error;
    }
    
    console.log('🔍 [fetchUserAgents] Raw data received:', data);
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
    
    const { data, error } = await safeSupabaseRequest(query);
    
    if (error) {
      console.error("[AGENT_SERVICE] Error fetching user accessible agents:", error);
      throw error;
    }
    
    // Extract agents from the nested structure with proper type checking
    const agents: Agent[] = [];
    if (data && Array.isArray(data)) {
      data.forEach(item => {
        if (item && item.agent && typeof item.agent === 'object' && !Array.isArray(item.agent)) {
          // Ensure the agent object has all required Agent properties
          const agent = item.agent as any;
          if (agent.id && agent.name && agent.status && agent.created_at && agent.updated_at) {
            agents.push(agent as Agent);
          }
        }
      });
    }
    
    return agents;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAccessibleAgents:", error);
    throw new Error(`Failed to fetch user accessible agents: ${error.message}`);
  }
};

export const fetchCompanyUserAgents = async (companyId: string): Promise<UserAgent[]> => {
  try {
    console.log('🔍 [fetchCompanyUserAgents] Fetching for company:', companyId);
    
    const { data, error } = await safeSupabaseRequest(
      supabase
        .from("user_agents")
        .select(`
        *,
        agent:agents!inner(*),
        user_details:user_profiles!inner(id, email, name, avatar_url)
      `)
        .eq("company_id", companyId)
    );
      
    if (error) {
      console.error("[AGENT_SERVICE] Error fetching company user agents:", error);
      throw error;
    }
    
    console.log('🔍 [fetchCompanyUserAgents] Data received:', data);
    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchCompanyUserAgents:", error);
    throw new Error(`Failed to fetch company user agents: ${error.message}`);
  }
};