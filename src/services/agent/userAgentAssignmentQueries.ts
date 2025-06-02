import { supabase } from "@/integrations/supabase/client";

export interface UserAgentAssignment {
  id: string;
  user_id: string;
  agent_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by?: string;
  // Populated data
  user_details?: {
    id: string;
    email: string;
    full_name?: string;
  };
  agent_details?: {
    id: string;
    retell_agent_id?: string;
    name: string;
    description?: string;
    status: string;
  };
}

export const fetchUserAgentAssignments = async (): Promise<UserAgentAssignment[]> => {
  try {
    console.log('🔍 [fetchUserAgentAssignments] Starting fetch with proper JOIN query');
    
    // Use a single JOIN query to fetch all data at once
    const { data: assignments, error } = await supabase
      .from("user_agent_assignments")
      .select(`
        id,
        user_id,
        agent_id,
        is_primary,
        assigned_at,
        assigned_by,
        profiles!user_agent_assignments_user_id_fkey (
          id,
          email,
          full_name
        ),
        retell_agents!user_agent_assignments_agent_id_fkey (
          id,
          retell_agent_id,
          name,
          description,
          status
        )
      `)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error('❌ [fetchUserAgentAssignments] Error with JOIN query:', error);
      throw new Error(`Cannot access user_agent_assignments with JOIN: ${error.message}`);
    }

    if (!assignments || assignments.length === 0) {
      console.log('🔍 [fetchUserAgentAssignments] No assignments found');
      return [];
    }

    console.log('🔍 [fetchUserAgentAssignments] Found', assignments.length, 'assignments with JOIN data');

    // Transform the data to match the UserAgentAssignment interface
    const enrichedAssignments: UserAgentAssignment[] = assignments.map(assignment => {
      console.log('🔍 [fetchUserAgentAssignments] Processing assignment:', {
        id: assignment.id,
        user_data: assignment.profiles,
        agent_data: assignment.retell_agents
      });

      return {
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary || false,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: assignment.profiles ? {
          id: assignment.profiles.id,
          email: assignment.profiles.email,
          full_name: assignment.profiles.full_name
        } : undefined,
        agent_details: assignment.retell_agents ? {
          id: assignment.retell_agents.id,
          retell_agent_id: assignment.retell_agents.retell_agent_id,
          name: assignment.retell_agents.name,
          description: assignment.retell_agents.description,
          status: assignment.retell_agents.status
        } : undefined
      };
    });

    console.log('🔍 [fetchUserAgentAssignments] Final enriched assignments:', enrichedAssignments.length);
    console.log('🔍 [fetchUserAgentAssignments] Sample assignment data:', enrichedAssignments[0]);
    
    return enrichedAssignments;
  } catch (error: any) {
    console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error in fetchUserAgentAssignments:", error);
    throw new Error(`Failed to fetch user agent assignments: ${error.message}`);
  }
};

// New function to fetch assignments for the current authenticated user
export const fetchCurrentUserAgentAssignments = async (): Promise<UserAgentAssignment[]> => {
  try {
    console.log('🔍 [fetchCurrentUserAgentAssignments] Starting fetch for current user');
    
    const { data: assignments, error } = await supabase
      .from("user_agent_assignments")
      .select(`
        id,
        user_id,
        agent_id,
        is_primary,
        assigned_at,
        assigned_by,
        profiles!user_agent_assignments_user_id_fkey (
          id,
          email,
          full_name
        ),
        retell_agents!user_agent_assignments_agent_id_fkey (
          id,
          retell_agent_id,
          name,
          description,
          status
        )
      `)
      .eq('user_id', supabase.auth.getUser().then(({ data }) => data.user?.id))
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error('❌ [fetchCurrentUserAgentAssignments] Error:', error);
      throw new Error(`Failed to fetch current user assignments: ${error.message}`);
    }

    if (!assignments || assignments.length === 0) {
      console.log('🔍 [fetchCurrentUserAgentAssignments] No assignments found for current user');
      return [];
    }

    console.log('🔍 [fetchCurrentUserAgentAssignments] Found', assignments.length, 'assignments for current user');

    const enrichedAssignments: UserAgentAssignment[] = assignments.map(assignment => ({
      id: assignment.id,
      user_id: assignment.user_id,
      agent_id: assignment.agent_id,
      is_primary: assignment.is_primary || false,
      assigned_at: assignment.assigned_at,
      assigned_by: assignment.assigned_by,
      user_details: assignment.profiles ? {
        id: assignment.profiles.id,
        email: assignment.profiles.email,
        full_name: assignment.profiles.full_name
      } : undefined,
      agent_details: assignment.retell_agents ? {
        id: assignment.retell_agents.id,
        retell_agent_id: assignment.retell_agents.retell_agent_id,
        name: assignment.retell_agents.name,
        description: assignment.retell_agents.description,
        status: assignment.retell_agents.status
      } : undefined
    }));

    return enrichedAssignments;
  } catch (error: any) {
    console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error in fetchCurrentUserAgentAssignments:", error);
    throw new Error(`Failed to fetch current user agent assignments: ${error.message}`);
  }
};

export const removeUserAgentAssignment = async (assignmentId: string): Promise<boolean> => {
  try {
    console.log('🔍 [removeUserAgentAssignment] Removing assignment:', assignmentId);
    
    const { error } = await supabase
      .from("user_agent_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error removing assignment:", error);
      throw error;
    }

    console.log('🔍 [removeUserAgentAssignment] Assignment removed successfully');
    return true;
  } catch (error: any) {
    console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error in removeUserAgentAssignment:", error);
    throw new Error(`Failed to remove assignment: ${error.message}`);
  }
};

export const updateUserAgentAssignmentPrimary = async (
  assignmentId: string,
  isPrimary: boolean,
  userId: string
): Promise<boolean> => {
  try {
    console.log('🔍 [updateUserAgentAssignmentPrimary] Updating assignment:', assignmentId, 'isPrimary:', isPrimary);
    
    // If setting as primary, first unset all other primary assignments for this user
    if (isPrimary) {
      await supabase
        .from("user_agent_assignments")
        .update({ is_primary: false })
        .eq("user_id", userId);
    }
    
    const { error } = await supabase
      .from("user_agent_assignments")
      .update({ is_primary: isPrimary })
      .eq("id", assignmentId);

    if (error) {
      console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error updating assignment primary status:", error);
      throw error;
    }

    console.log('🔍 [updateUserAgentAssignmentPrimary] Assignment updated successfully');
    return true;
  } catch (error: any) {
    console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error in updateUserAgentAssignmentPrimary:", error);
    throw new Error(`Failed to update assignment primary status: ${error.message}`);
  }
};

export const createUserAgentAssignment = async (
  userId: string,
  agentId: string,
  isPrimary: boolean = false
): Promise<boolean> => {
  try {
    console.log('🔍 [createUserAgentAssignment] Creating assignment:', { userId, agentId, isPrimary });

    // If setting as primary, first unset all other primary assignments for this user
    if (isPrimary) {
      await supabase
        .from("user_agent_assignments")
        .update({ is_primary: false })
        .eq("user_id", userId);
    }

    // Create the new assignment
    const { error } = await supabase
      .from("user_agent_assignments")
      .insert({
        user_id: userId,
        agent_id: agentId,
        is_primary: isPrimary,
        assigned_at: new Date().toISOString()
      });

    if (error) {
      console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error creating assignment:", error);
      throw error;
    }

    console.log('🔍 [createUserAgentAssignment] Assignment created successfully');
    return true;
  } catch (error: any) {
    console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error in createUserAgentAssignment:", error);
    throw new Error(`Failed to create assignment: ${error.message}`);
  }
};
