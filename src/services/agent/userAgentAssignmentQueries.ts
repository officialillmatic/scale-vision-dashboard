
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
    
    // First check if we have any assignments at all
    const { data: testData, error: testError } = await supabase
      .from("user_agent_assignments")
      .select("*")
      .limit(5);

    console.log('🔍 [fetchUserAgentAssignments] Test query result:', testData, testError);

    if (testError) {
      console.error('❌ [fetchUserAgentAssignments] Error accessing user_agent_assignments:', testError);
      throw new Error(`Cannot access user_agent_assignments table: ${testError.message}`);
    }

    if (!testData || testData.length === 0) {
      console.log('🔍 [fetchUserAgentAssignments] No assignments found in user_agent_assignments table');
      
      // Check if we have data in user_agents table instead
      const { data: userAgentsData, error: userAgentsError } = await supabase
        .from("user_agents")
        .select(`
          id,
          user_id,
          agent_id,
          is_primary,
          created_at,
          company_id,
          user_profiles!inner(id, email, name, avatar_url),
          agents!inner(id, name, description, status, retell_agent_id)
        `)
        .limit(10);

      console.log('🔍 [fetchUserAgentAssignments] User agents query result:', userAgentsData, userAgentsError);

      if (userAgentsError) {
        console.error('❌ [fetchUserAgentAssignments] Error accessing user_agents:', userAgentsError);
        throw new Error(`Cannot access user_agents table: ${userAgentsError.message}`);
      }

      if (userAgentsData && userAgentsData.length > 0) {
        // Transform user_agents data to match UserAgentAssignment interface
        const transformedData: UserAgentAssignment[] = userAgentsData.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          agent_id: item.agent_id,
          is_primary: item.is_primary,
          assigned_at: item.created_at,
          user_details: item.user_profiles ? {
            id: item.user_profiles.id,
            email: item.user_profiles.email,
            name: item.user_profiles.name,
            avatar_url: item.user_profiles.avatar_url
          } : undefined,
          agent_details: item.agents ? {
            id: item.agents.id,
            retell_agent_id: item.agents.retell_agent_id || '',
            name: item.agents.name,
            description: item.agents.description,
            status: item.agents.status
          } : undefined
        }));
        
        console.log('🔍 [fetchUserAgentAssignments] Transformed user_agents data:', transformedData);
        return transformedData;
      }

      return [];
    }

    // If we have data in user_agent_assignments, fetch with manual joins
    const { data: assignments, error: assignmentsError } = await supabase
      .from("user_agent_assignments")
      .select("*")
      .order("assigned_at", { ascending: false });

    if (assignmentsError) {
      throw assignmentsError;
    }

    if (!assignments || assignments.length === 0) {
      console.log('🔍 [fetchUserAgentAssignments] No assignments found, returning empty array');
      return [];
    }

    // Manually fetch user and agent details for each assignment
    const enrichedAssignments: UserAgentAssignment[] = [];

    for (const assignment of assignments) {
      console.log('🔍 [fetchUserAgentAssignments] Processing assignment:', assignment);

      // Fetch user details from user_profiles
      const { data: userData, error: userError } = await supabase
        .from("user_profiles")
        .select("id, email, name, avatar_url")
        .eq("id", assignment.user_id)
        .single();

      console.log('🔍 [fetchUserAgentAssignments] User data for', assignment.user_id, ':', userData, userError);

      // Try different agent tables
      let agentData = null;
      let agentError = null;

      // First try retell_agents
      const { data: retellAgentData, error: retellAgentError } = await supabase
        .from("retell_agents")
        .select("id, agent_id as retell_agent_id, name, description, status")
        .eq("id", assignment.agent_id)
        .single();

      if (retellAgentData) {
        agentData = retellAgentData;
      } else {
        // Try agents table
        const { data: regularAgentData, error: regularAgentError } = await supabase
          .from("agents")
          .select("id, retell_agent_id, name, description, status")
          .eq("id", assignment.agent_id)
          .single();
        
        agentData = regularAgentData;
        agentError = regularAgentError;
      }

      console.log('🔍 [fetchUserAgentAssignments] Agent data for', assignment.agent_id, ':', agentData, agentError);

      enrichedAssignments.push({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: userData ? {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url
        } : undefined,
        agent_details: agentData ? {
          id: agentData.id,
          retell_agent_id: agentData.retell_agent_id || agentData.agent_id || '',
          name: agentData.name,
          description: agentData.description,
          status: agentData.status
        } : undefined
      });
    }

    console.log('🔍 [fetchUserAgentAssignments] Final enriched assignments:', enrichedAssignments);
    return enrichedAssignments;
  } catch (error: any) {
    console.error("❌ [USER_AGENT_ASSIGNMENT_SERVICE] Error in fetchUserAgentAssignments:", error);
    throw new Error(`Failed to fetch user agent assignments: ${error.message}`);
  }
};

export const removeUserAgentAssignment = async (assignmentId: string): Promise<boolean> => {
  try {
    console.log('🔍 [removeUserAgentAssignment] Removing assignment:', assignmentId);
    
    // Try user_agent_assignments first
    let { error } = await supabase
      .from("user_agent_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      console.log('🔍 [removeUserAgentAssignment] Trying user_agents table instead');
      // Try user_agents table
      const { error: userAgentsError } = await supabase
        .from("user_agents")
        .delete()
        .eq("id", assignmentId);
      
      if (userAgentsError) {
        console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error removing assignment:", userAgentsError);
        throw userAgentsError;
      }
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
      // Try both tables
      await supabase
        .from("user_agent_assignments")
        .update({ is_primary: false })
        .eq("user_id", userId);
        
      await supabase
        .from("user_agents")
        .update({ is_primary: false })
        .eq("user_id", userId);
    }
    
    // Try user_agent_assignments first
    let { error } = await supabase
      .from("user_agent_assignments")
      .update({ is_primary: isPrimary })
      .eq("id", assignmentId);

    if (error) {
      console.log('🔍 [updateUserAgentAssignmentPrimary] Trying user_agents table instead');
      // Try user_agents table
      const { error: userAgentsError } = await supabase
        .from("user_agents")
        .update({ is_primary: isPrimary })
        .eq("id", assignmentId);
      
      if (userAgentsError) {
        console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error updating assignment primary status:", userAgentsError);
        throw userAgentsError;
      }
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

    // Get user's company_id first
    const { data: userProfile, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError) {
      throw new Error(`User not found: ${userError.message}`);
    }

    // Get user's company - try multiple approaches
    let companyId = null;
    
    const { data: companyData } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", userId)
      .single();
    
    if (companyData) {
      companyId = companyData.id;
    } else {
      // Try company_members
      const { data: memberData } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      
      if (memberData) {
        companyId = memberData.company_id;
      }
    }

    if (!companyId) {
      throw new Error("User is not associated with any company");
    }

    // If setting as primary, first unset all other primary assignments for this user
    if (isPrimary) {
      await supabase
        .from("user_agent_assignments")
        .update({ is_primary: false })
        .eq("user_id", userId);
        
      await supabase
        .from("user_agents")
        .update({ is_primary: false })
        .eq("user_id", userId);
    }

    // Try to create in user_agents table (the main table being used)
    const { error: userAgentsError } = await supabase
      .from("user_agents")
      .insert({
        user_id: userId,
        agent_id: agentId,
        company_id: companyId,
        is_primary: isPrimary
      });

    if (userAgentsError) {
      console.log('🔍 [createUserAgentAssignment] user_agents failed, trying user_agent_assignments');
      // Fallback to user_agent_assignments
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
    }

    console.log('🔍 [createUserAgentAssignment] Assignment created successfully');
    return true;
  } catch (error: any) {
    console.error("[USER_AGENT_ASSIGNMENT_SERVICE] Error in createUserAgentAssignment:", error);
    throw new Error(`Failed to create assignment: ${error.message}`);
  }
};
