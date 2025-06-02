
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
    name?: string;
    avatar_url?: string;
  };
  agent_details?: {
    id: string;
    retell_agent_id: string;
    name: string;
    description?: string;
    status: string;
  };
}

export const fetchUserAgentAssignments = async (): Promise<UserAgentAssignment[]> => {
  try {
    console.log('🔍 [fetchUserAgentAssignments] Fetching assignments from user_agent_assignments table');
    
    const { data, error } = await supabase
      .from("user_agent_assignments")
      .select(`
        *,
        user_details:users!user_agent_assignments_user_id_fkey(id, email, full_name),
        agent_details:retell_agents!user_agent_assignments_agent_id_fkey(id, retell_agent_id, name, description, status)
      `)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error fetching assignments:", error);
      throw error;
    }

    console.log('🔍 [fetchUserAgentAssignments] Raw data received:', data);
    console.log('🔍 [fetchUserAgentAssignments] Number of assignments:', data?.length || 0);

    // Transform the data to match our interface
    const assignments: UserAgentAssignment[] = (data || []).map(item => ({
      id: item.id,
      user_id: item.user_id,
      agent_id: item.agent_id,
      is_primary: item.is_primary,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      user_details: item.user_details ? {
        id: item.user_details.id,
        email: item.user_details.email,
        name: item.user_details.full_name,
        avatar_url: undefined
      } : undefined,
      agent_details: item.agent_details ? {
        id: item.agent_details.id,
        retell_agent_id: item.agent_details.retell_agent_id,
        name: item.agent_details.name,
        description: item.agent_details.description,
        status: item.agent_details.status
      } : undefined
    }));

    return assignments;
  } catch (error: any) {
    console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error in fetchUserAgentAssignments:", error);
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
