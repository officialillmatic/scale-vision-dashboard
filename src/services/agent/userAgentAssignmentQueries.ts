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
    console.log('🔍 [fetchUserAgentAssignments] Starting fetch with corrected query');
    
    // Usar consulta corregida sin JOINs problemáticos
    const { data: assignments, error } = await supabase
      .from("user_agent_assignments")
      .select(`
        id,
        user_id,
        agent_id,
        is_primary,
        assigned_at,
        assigned_by
      `)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error('❌ [fetchUserAgentAssignments] Error:', error);
      throw new Error(`Cannot access user_agent_assignments: ${error.message}`);
    }

    if (!assignments || assignments.length === 0) {
      console.log('🔍 [fetchUserAgentAssignments] No assignments found');
      return [];
    }

    console.log('🔍 [fetchUserAgentAssignments] Found', assignments.length, 'assignments');

    // Hacer consultas separadas para obtener user_details y agent_details
    const enrichedAssignments: UserAgentAssignment[] = [];
    
    for (const assignment of assignments) {
      console.log('🔍 [fetchUserAgentAssignments] Processing assignment:', assignment);
      
      // 🔧 CORRECCIÓN: Usar 'profiles' table como en Team Members (que funciona)
      const { data: userDetails, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignment.user_id)
        .single();

      let fallbackUser = null;
      if (userError) {
        console.error('❌ [fetchUserAgentAssignments] Error fetching user details from profiles:', userError);
        // Fallback: intentar desde users table
        const { data: fallbackUserData } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', assignment.user_id)
          .single();
        fallbackUser = fallbackUserData;
        console.log('🔍 [fetchUserAgentAssignments] Fallback user from users table:', fallbackUser);
      }

      // 🔧 CORRECCIÓN: Obtener detalles del agente desde custom_ai_agents
      const { data: agentDetails, error: agentError } = await supabase
        .from('custom_ai_agents')
        .select('id, retell_agent_id, name, description, status')
        .eq('id', assignment.agent_id)
        .single();

      if (agentError) {
        console.error('❌ [fetchUserAgentAssignments] Error fetching agent details:', agentError);
      }

      console.log('🔍 [fetchUserAgentAssignments] User details:', userDetails);
      console.log('🔍 [fetchUserAgentAssignments] Agent details:', agentDetails);

      // Preparar user_details con fallback
      const finalUserDetails = userDetails || fallbackUser;
      
      enrichedAssignments.push({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary || false,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: finalUserDetails ? {
          id: finalUserDetails.id,
          email: finalUserDetails.email,
          full_name: finalUserDetails.full_name || null
        } : undefined,
        agent_details: agentDetails ? {
          id: agentDetails.id,
          retell_agent_id: agentDetails.retell_agent_id,
          name: agentDetails.name, // 🔧 CORRECCIÓN: Usar el nombre real del agente
          description: agentDetails.description || 'Custom AI Agent',
          status: agentDetails.status || 'active'
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

// New function to fetch assignments for the current authenticated user
export const fetchCurrentUserAgentAssignments = async (): Promise<UserAgentAssignment[]> => {
  try {
    console.log('🔍 [fetchCurrentUserAgentAssignments] Starting fetch for current user');
    
    // Get current user first and log it
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('🔍 [fetchCurrentUserAgentAssignments] Current user from auth:', user?.id);
    console.log('🔍 [fetchCurrentUserAgentAssignments] User error:', userError);
    
    if (!user?.id) {
      console.log('🔍 [fetchCurrentUserAgentAssignments] No authenticated user found');
      return [];
    }

    // Get assignments for current user
    const { data: assignments, error } = await supabase
      .from("user_agent_assignments")
      .select(`
        id,
        user_id,
        agent_id,
        is_primary,
        assigned_at,
        assigned_by
      `)
      .eq('user_id', user.id)
      .order("assigned_at", { ascending: false });

    console.log('🔍 [fetchCurrentUserAgentAssignments] Query result:', assignments);
    console.log('🔍 [fetchCurrentUserAgentAssignments] Query error:', error);

    if (error) {
      console.error('❌ [fetchCurrentUserAgentAssignments] Error:', error);
      throw new Error(`Failed to fetch current user assignments: ${error.message}`);
    }

    if (!assignments || assignments.length === 0) {
      console.log('🔍 [fetchCurrentUserAgentAssignments] No assignments found for current user');
      return [];
    }

    console.log('🔍 [fetchCurrentUserAgentAssignments] Found', assignments.length, 'assignments for current user');

    // Enrich assignments with user and agent details
    const enrichedAssignments: UserAgentAssignment[] = [];
    
    for (const assignment of assignments) {
      console.log('🔍 [fetchCurrentUserAgentAssignments] Processing assignment:', assignment);
      
      // 🔧 CORRECCIÓN: Usar 'profiles' table como en Team Members (que funciona)
      const { data: userDetails, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignment.user_id)
        .single();

      let fallbackUser = null;
      if (userError) {
        console.error('❌ [fetchCurrentUserAgentAssignments] Error fetching user details from profiles:', userError);
        // Fallback: intentar desde users table
        const { data: fallbackUserData } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', assignment.user_id)
          .single();
        fallbackUser = fallbackUserData;
        console.log('🔍 [fetchCurrentUserAgentAssignments] Fallback user from users table:', fallbackUser);
      }

      // 🔧 CORRECCIÓN: Obtener detalles del agente desde custom_ai_agents
      const { data: agentDetails, error: agentError } = await supabase
        .from('custom_ai_agents')
        .select('id, retell_agent_id, name, description, status')
        .eq('id', assignment.agent_id)
        .single();

      if (agentError) {
        console.error('❌ [fetchCurrentUserAgentAssignments] Error fetching agent details:', agentError);
      }

      console.log('🔍 [fetchCurrentUserAgentAssignments] User details:', userDetails);
      console.log('🔍 [fetchCurrentUserAgentAssignments] Agent details:', agentDetails);

      // Preparar user_details con fallback
      const finalUserDetails = userDetails || fallbackUser;

      enrichedAssignments.push({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary || false,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: finalUserDetails ? {
          id: finalUserDetails.id,
          email: finalUserDetails.email,
          full_name: finalUserDetails.full_name || null
        } : undefined,
        agent_details: agentDetails ? {
          id: agentDetails.id,
          retell_agent_id: agentDetails.retell_agent_id,
          name: agentDetails.name, // 🔧 CORRECCIÓN: Usar el nombre real del agente
          description: agentDetails.description || 'Custom AI Agent',
          status: agentDetails.status || 'active'
        } : undefined
      });
    }

    console.log('🔍 [fetchCurrentUserAgentAssignments] Final enriched assignments:', enrichedAssignments);
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