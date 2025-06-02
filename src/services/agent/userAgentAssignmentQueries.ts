
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
    console.log('🔍 [fetchUserAgentAssignments] Starting fetch from user_agent_assignments table');
    
    // First get all assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from("user_agent_assignments")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (assignmentsError) {
      console.error('❌ [fetchUserAgentAssignments] Error accessing user_agent_assignments:', assignmentsError);
      throw new Error(`Cannot access user_agent_assignments table: ${assignmentsError.message}`);
    }

    if (!assignments || assignments.length === 0) {
      console.log('🔍 [fetchUserAgentAssignments] No assignments found');
      return [];
    }

    console.log('🔍 [fetchUserAgentAssignments] Found', assignments.length, 'assignments');

    // Manually fetch user and agent details for each assignment
    const enrichedAssignments: UserAgentAssignment[] = [];

    for (const assignment of assignments) {
      console.log('🔍 [fetchUserAgentAssignments] Processing assignment:', assignment.id);

      // Fetch user details from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .eq("id", assignment.user_id)
        .single();

      if (userError) {
        console.warn('⚠️ [fetchUserAgentAssignments] User data error for', assignment.user_id, ':', userError);
      }

      // Fetch agent details from retell_agents table
      const { data: agentData, error: agentError } = await supabase
        .from("retell_agents")
        .select("id, retell_agent_id, name, description, status")
        .eq("id", assignment.agent_id)
        .single();

      if (agentError) {
        console.warn('⚠️ [fetchUserAgentAssignments] Agent data error for', assignment.agent_id, ':', agentError);
      }

      enrichedAssignments.push({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary || false,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: userData ? {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name
        } : undefined,
        agent_details: agentData ? {
          id: agentData.id,
          retell_agent_id: agentData.retell_agent_id,
          name: agentData.name,
          description: agentData.description,
          status: agentData.status
        } : undefined
      });
    }

    console.log('🔍 [fetchUserAgentAssignments] Final enriched assignments:', enrichedAssignments.length);
    return enrichedAssignments;
  } catch (error: any) {
    console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error in fetchUserAgentAssignments:", error);
    throw new Error(`Failed to fetch user agent assignments: ${error.message}`);
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
