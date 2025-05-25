import { supabase } from "@/integrations/supabase/client";
import { AgentTable, UserAgentTable } from "@/types/supabase";
import { toast } from "sonner";

export type Agent = AgentTable & {
  rate_per_minute?: number;
  retell_agent_id?: string;
};

export type UserAgent = UserAgentTable & {
  agent?: Agent;
  user_details?: {
    email: string;
    name?: string;
  };
};

export const fetchAgents = async (companyId?: string): Promise<Agent[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[AGENT-SERVICE] No authenticated user");
      return [];
    }

    // Use optimized security definer function
    if (companyId) {
      const { data, error } = await supabase
        .rpc('get_user_accessible_agents', {
          p_user_id: user.id,
          p_company_id: companyId
        });

      if (error) {
        console.error("Error fetching agents:", error);
        toast.error("Failed to load agents");
        return [];
      }

      return data || [];
    } else {
      // Super admin fetching all agents
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching all agents:", error);
        toast.error("Failed to load agents");
        return [];
      }

      return data || [];
    }
  } catch (error) {
    console.error("Error in fetchAgents:", error);
    toast.error("Failed to load agents");
    return [];
  }
};

export const fetchUserAgents = async (companyId?: string): Promise<UserAgent[]> => {
  if (!companyId) return [];

  try {
    // Use optimized security definer function
    const { data, error } = await supabase
      .rpc('get_company_user_agents', {
        p_company_id: companyId
      });

    if (error) {
      console.error("Error fetching user agents:", error);
      toast.error("Failed to load agent assignments");
      return [];
    }

    // Transform the data to match the expected format
    const userAgentsWithDetails = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      agent_id: item.agent_id,
      company_id: item.company_id,
      is_primary: item.is_primary,
      created_at: item.created_at,
      updated_at: item.updated_at,
      agent: item.agent_name ? {
        id: item.agent_id,
        name: item.agent_name,
        description: item.agent_description
      } : null,
      user_details: {
        email: item.user_email || "Unknown"
      }
    }));

    return userAgentsWithDetails;
  } catch (error) {
    console.error("Error in fetchUserAgents:", error);
    toast.error("Failed to load agent assignments");
    return [];
  }
};

export const createAgent = async (agentData: Partial<Agent>): Promise<Agent | null> => {
  try {
    const dataWithTimestamps = {
      ...agentData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("agents")
      .insert([dataWithTimestamps])
      .select()
      .single();

    if (error) {
      console.error("Error creating agent:", error);
      toast.error("Failed to create agent");
      return null;
    }

    toast.success("Agent created successfully");
    return data;
  } catch (error) {
    console.error("Error in createAgent:", error);
    toast.error("Failed to create agent");
    return null;
  }
};

export const updateAgent = async (id: string, agentData: Partial<Agent>): Promise<boolean> => {
  try {
    const dataWithTimestamp = {
      ...agentData,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("agents")
      .update(dataWithTimestamp)
      .eq("id", id);

    if (error) {
      console.error("Error updating agent:", error);
      toast.error("Failed to update agent");
      return false;
    }

    toast.success("Agent updated successfully");
    return true;
  } catch (error) {
    console.error("Error in updateAgent:", error);
    toast.error("Failed to update agent");
    return false;
  }
};

export const deleteAgent = async (id: string): Promise<boolean> => {
  try {
    const { error: assignmentError } = await supabase
      .from("user_agents")
      .delete()
      .eq("agent_id", id);
      
    if (assignmentError) {
      console.error("Error removing agent assignments:", assignmentError);
      toast.error("Failed to remove agent assignments");
      return false;
    }

    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting agent:", error);
      toast.error("Failed to delete agent");
      return false;
    }

    toast.success("Agent deleted successfully");
    return true;
  } catch (error) {
    console.error("Error in deleteAgent:", error);
    toast.error("Failed to delete agent");
    return false;
  }
};

export const assignAgentToUser = async (
  userAgent: Partial<UserAgentTable>
): Promise<UserAgent | null> => {
  try {
    const dataWithTimestamps = {
      ...userAgent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_agents")
      .insert([dataWithTimestamps])
      .select(`
        *,
        agent:agents(*)
      `)
      .single();

    if (error) {
      console.error("Error assigning agent to user:", error);
      toast.error("Failed to assign agent");
      return null;
    }

    toast.success("Agent assigned successfully");
    return data;
  } catch (error) {
    console.error("Error in assignAgentToUser:", error);
    toast.error("Failed to assign agent");
    return null;
  }
};

export const removeAgentFromUser = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("user_agents")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing agent from user:", error);
      toast.error("Failed to remove agent assignment");
      return false;
    }

    toast.success("Agent assignment removed successfully");
    return true;
  } catch (error) {
    console.error("Error in removeAgentFromUser:", error);
    toast.error("Failed to remove agent assignment");
    return false;
  }
};
