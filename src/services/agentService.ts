
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
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to load agents");
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchAgents:", error);
    toast.error("Failed to load agents");
    return [];
  }
};

export const fetchUserAgents = async (companyId?: string): Promise<UserAgent[]> => {
  if (!companyId) return [];

  try {
    const { data, error } = await supabase
      .from("user_agents")
      .select(`
        *,
        agent:agents(*)
      `)
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching user agents:", error);
      toast.error("Failed to load agent assignments");
      return [];
    }

    // Fetch user details for each user agent
    const userAgentsWithDetails = await Promise.all(
      (data || []).map(async (userAgent) => {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("email")
          .eq("id", userAgent.user_id)
          .single();

        return {
          ...userAgent,
          user_details: userError 
            ? { email: "Unknown" } 
            : { email: userData?.email || "Unknown" }
        };
      })
    );

    return userAgentsWithDetails;
  } catch (error) {
    console.error("Error in fetchUserAgents:", error);
    toast.error("Failed to load agent assignments");
    return [];
  }
};

export const createAgent = async (agentData: Partial<Agent>): Promise<Agent | null> => {
  try {
    // Add created_at and updated_at if not provided
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
    // Add updated_at timestamp
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
    // First remove any user assignments for this agent
    const { error: assignmentError } = await supabase
      .from("user_agents")
      .delete()
      .eq("agent_id", id);
      
    if (assignmentError) {
      console.error("Error removing agent assignments:", assignmentError);
      toast.error("Failed to remove agent assignments");
      return false;
    }

    // Then delete the agent
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
    // Add timestamps
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
