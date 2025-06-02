
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
    console.log('🔍 [fetchUserAgentAssignments] Starting fetch from user_agent_assignments table');
    
    // First, let's check if we have any data in the table at all
    const { data: tableCheck, error: tableError } = await supabase
      .from("user_agent_assignments")
      .select("*")
      .limit(5);

    console.log('🔍 [fetchUserAgentAssignments] Table check - Raw data:', tableCheck);
    console.log('🔍 [fetchUserAgentAssignments] Table check - Error:', tableError);

    if (tableError) {
      console.error('❌ [fetchUserAgentAssignments] Table access error:', tableError);
      throw tableError;
    }

    // Now let's try the full query with joins
    console.log('🔍 [fetchUserAgentAssignments] Attempting full query with joins...');
    
    const { data, error } = await supabase
      .from("user_agent_assignments")
      .select(`
        *,
        user_details:users!user_agent_assignments_user_id_fkey(id, email, full_name),
        agent_details:retell_agents!user_agent_assignments_agent_id_fkey(id, retell_agent_id, name, description, status)
      `)
      .order("assigned_at", { ascending: false });

    console.log('🔍 [fetchUserAgentAssignments] Full query result - Data:', data);
    console.log('🔍 [fetchUserAgentAssignments] Full query result - Error:', error);

    if (error) {
      console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error fetching assignments:", error);
      
      // Try a simpler query without joins to see if it's a join issue
      console.log('🔍 [fetchUserAgentAssignments] Trying fallback query without joins...');
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("user_agent_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });

      console.log('🔍 [fetchUserAgentAssignments] Fallback query - Data:', fallbackData);
      console.log('🔍 [fetchUserAgentAssignments] Fallback query - Error:', fallbackError);

      if (fallbackError) {
        throw fallbackError;
      }

      // If fallback works, manually fetch related data
      if (fallbackData && fallbackData.length > 0) {
        console.log('🔍 [fetchUserAgentAssignments] Manually fetching related data...');
        
        const assignments: UserAgentAssignment[] = [];
        
        for (const assignment of fallbackData) {
          // Fetch user details
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, email, full_name")
            .eq("id", assignment.user_id)
            .single();

          // Fetch agent details
          const { data: agentData, error: agentError } = await supabase
            .from("retell_agents")
            .select("id, retell_agent_id, name, description, status")
            .eq("id", assignment.agent_id)
            .single();

          console.log('🔍 [fetchUserAgentAssignments] User data for', assignment.user_id, ':', userData, userError);
          console.log('🔍 [fetchUserAgentAssignments] Agent data for', assignment.agent_id, ':', agentData, agentError);

          assignments.push({
            id: assignment.id,
            user_id: assignment.user_id,
            agent_id: assignment.agent_id,
            is_primary: assignment.is_primary,
            assigned_at: assignment.assigned_at,
            assigned_by: assignment.assigned_by,
            user_details: userData ? {
              id: userData.id,
              email: userData.email,
              name: userData.full_name,
              avatar_url: undefined
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

        console.log('🔍 [fetchUserAgentAssignments] Final assignments with manual joins:', assignments);
        return assignments;
      }

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

    console.log('🔍 [fetchUserAgentAssignments] Transformed assignments:', assignments);
    return assignments;
  } catch (error: any) {
    console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error in fetchUserAgentAssignments:", error);
    console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
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
