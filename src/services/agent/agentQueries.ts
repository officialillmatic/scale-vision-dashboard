
import { supabase } from "@/integrations/supabase/client";
import { Agent, UserAgent } from "./agentTypes";

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
      // Return empty array instead of throwing for better UX
      return [];
    }

    console.log("[AGENT_SERVICE] Successfully fetched", data?.length || 0, "agents");
    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchAgents:", error);
    // Return empty array instead of throwing
    return [];
  }
};

export const fetchUserAgents = async (companyId?: string): Promise<UserAgent[]> => {
  console.log("[AGENT_SERVICE] Fetching user agents for company:", companyId);
  
  try {
    // 1. Obtener user_agents básicos
    let query = supabase
      .from("user_agents")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    const { data: userAgents, error } = await query;
    
    if (error) {
      console.error("[AGENT_SERVICE] Database error:", error);
      return [];
    }
    
    if (!userAgents || userAgents.length === 0) {
      return [];
    }
    
    // 2. Obtener datos de agentes
    const agentIds = [...new Set(userAgents.map(ua => ua.agent_id))];
    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .in("id", agentIds);
    
    // 3. Obtener datos de usuarios
    const userIds = [...new Set(userAgents.map(ua => ua.user_id))];
    const { data: users } = await supabase
      .from("user_profiles")
      .select("*")
      .in("id", userIds);
    
    // 4. Combinar los datos
    const enrichedUserAgents = userAgents.map(ua => ({
      ...ua,
      agent: agents?.find(a => a.id === ua.agent_id),
      user_details: users?.find(u => u.id === ua.user_id)
    }));
    
    console.log("[AGENT_SERVICE] Successfully fetched", enrichedUserAgents.length, "enriched user agents");
    return enrichedUserAgents;
    
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAgents:", error);
    return [];
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
      // Fallback to basic agent fetch
      return await fetchAgents(companyId);
    }

    console.log("[AGENT_SERVICE] Successfully fetched", data?.length || 0, "accessible agents");
    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchUserAccessibleAgents:", error);
    // Fallback to basic agent fetch
    return await fetchAgents(companyId);
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
      // Return empty array instead of throwing
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in fetchCompanyUserAgents:", error);
    // Return empty array instead of throwing
    return [];
  }
};
