
import { supabase } from "@/integrations/supabase/client";

export interface AssignmentUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
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
    console.log('🔍 [fetchAvailableUsers] Fetching users from user_profiles');
    
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, name, avatar_url")
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
    console.log('🔍 [fetchAvailableAgents] Fetching agents from multiple tables');
    
    // Try retell_agents first
    const { data: retellAgents, error: retellError } = await supabase
      .from("retell_agents")
      .select("id, name, description, status, agent_id")
      .eq("status", "active")
      .order("name");

    console.log('🔍 [fetchAvailableAgents] Retell agents result:', retellAgents?.length || 0, 'agents');

    // Try regular agents table
    const { data: regularAgents, error: regularError } = await supabase
      .from("agents")
      .select("id, name, description, status, retell_agent_id")
      .eq("status", "active")
      .order("name");

    console.log('🔍 [fetchAvailableAgents] Regular agents result:', regularAgents?.length || 0, 'agents');

    // Combine results and normalize structure
    const allAgents: AssignmentAgent[] = [];

    // Add retell agents
    if (retellAgents) {
      retellAgents.forEach(agent => {
        allAgents.push({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          status: agent.status,
          retell_agent_id: agent.agent_id
        });
      });
    }

    // Add regular agents (avoid duplicates by checking if ID already exists)
    if (regularAgents) {
      regularAgents.forEach(agent => {
        if (!allAgents.find(existing => existing.id === agent.id)) {
          allAgents.push({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            status: agent.status,
            retell_agent_id: agent.retell_agent_id
          });
        }
      });
    }

    console.log('🔍 [fetchAvailableAgents] Total combined agents:', allAgents.length);
    
    if (retellError && regularError) {
      console.error("[ASSIGNMENT_HELPERS] Error fetching from both agent tables:", retellError, regularError);
      throw new Error(`Cannot access agent tables: ${retellError.message} / ${regularError.message}`);
    }

    return allAgents;
  } catch (error: any) {
    console.error("[ASSIGNMENT_HELPERS] Error in fetchAvailableAgents:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};
