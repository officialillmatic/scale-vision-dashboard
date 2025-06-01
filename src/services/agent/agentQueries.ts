
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
    // Consulta simplificada sin embed para evitar errores de relación
    let query = supabase
      .from("user_agents")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    console.log("[AGENT_SERVICE] About to execute simplified query...");
    const { data, error } = await query;
    
    console.log("[AGENT_SERVICE] Raw response:", { data, error });
    
    if (error) {
      console.error("[AGENT_SERVICE] Database error:", error);
      return [];
    }
    
    console.log("[AGENT_SERVICE] Successfully fetched", data?.length || 0, "user agents");
    
    // Si necesitas los datos relacionados, hazlo en consultas separadas
    // Por ahora, devolvemos solo los datos básicos
    return data || [];
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
