
import { supabase } from "@/integrations/supabase/client";
import { Agent, UserAgent } from "./agentTypes";

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

export const assignAgentToUser = async (userAgentData: Partial<UserAgent>): Promise<UserAgent | null> => {
  try {
    // If this is being set as primary, first remove primary status from other agents for this user
    if (userAgentData.is_primary && userAgentData.user_id && userAgentData.company_id) {
      await supabase
        .from("user_agents")
        .update({ is_primary: false })
        .eq("user_id", userAgentData.user_id)
        .eq("company_id", userAgentData.company_id);
    }

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

export const updateUserAgentPrimary = async (userAgentId: string, isPrimary: boolean, userId: string, companyId: string): Promise<boolean> => {
  try {
    // If setting as primary, first remove primary status from other agents for this user
    if (isPrimary) {
      await supabase
        .from("user_agents")
        .update({ is_primary: false })
        .eq("user_id", userId)
        .eq("company_id", companyId);
    }

    const { error } = await supabase
      .from("user_agents")
      .update({ is_primary: isPrimary })
      .eq("id", userAgentId);

    if (error) {
      console.error("[AGENT_SERVICE] Error updating user agent primary status:", error);
      throw error;
    }
    
    return true;
  } catch (error: any) {
    console.error("[AGENT_SERVICE] Error in updateUserAgentPrimary:", error);
    throw new Error(`Failed to update user agent primary status: ${error.message}`);
  }
};
