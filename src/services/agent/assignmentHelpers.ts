
import { supabase } from "@/integrations/supabase/client";

export interface AssignmentUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface AssignmentAgent {
  id: string;
  name: string;
  description?: string;
  status: string;
  retell_agent_id?: string;
}

export const fetchAvailableUsers = async (): Promise<AssignmentUser[]> => {
  try {
    console.log('🔍 [fetchAvailableUsers] Fetching users from users table');
    
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name")
      .order("email");

    if (error) {
      console.error("[ASSIGNMENT_HELPERS] Error fetching users:", error);
      throw error;
    }

    console.log('🔍 [fetchAvailableUsers] Users fetched:', data?.length || 0, 'users');
    return data || [];
  } catch (error: any) {
    console.error("[ASSIGNMENT_HELPERS] Error in fetchAvailableUsers:", error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
};

export const fetchAvailableAgents = async (): Promise<AssignmentAgent[]> => {
  try {
    console.log('🔍 [fetchAvailableAgents] Fetching agents from retell_agents table');
    
    const { data, error } = await supabase
      .from("retell_agents")
      .select("id, name, description, status, retell_agent_id")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("[ASSIGNMENT_HELPERS] Error fetching agents:", error);
      throw error;
    }

    console.log('🔍 [fetchAvailableAgents] Agents fetched:', data?.length || 0, 'agents');
    return data || [];
  } catch (error: any) {
    console.error("[ASSIGNMENT_HELPERS] Error in fetchAvailableAgents:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};
