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

// 🔧 FUNCIÓN LOCAL que replica fetchAgents (que funciona)
const fetchAgentsLocal = async (companyId?: string) => {
  try {
    let query = supabase
      .from("agents")
      .select("*")
      .eq("status", "active");
    
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("[LOCAL_FETCH_AGENTS] Error fetching agents:", error);
      throw error;
    }
    
    return data || [];
  } catch (error: any) {
    console.error("[LOCAL_FETCH_AGENTS] Error:", error);
    throw new Error(`Failed to fetch agents: ${error.message}`);
  }
};

export const fetchUserAgentAssignments = async (): Promise<UserAgentAssignment[]> => {
  try {
    console.log('🔍 [fetchUserAgentAssignments] Starting fetch - using successful agent queries');
    
    // Usar consulta básica sin JOINs para evitar errores de relación
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

    console.log('🔍 [fetchUserAgentAssignments] Found', assignments.length, 'assignments, enriching...');

    // 🔧 USAR fetchAgentsLocal (replica de la función que funciona)
    const allAgents = await fetchAgentsLocal(); // Función local que replica la exitosa
    console.log('🔍 [fetchUserAgentAssignments] Fetched agents using working function:', allAgents.length, 'agents');
    console.log('🔍 [fetchUserAgentAssignments] Agent details:', allAgents);

    // Crear un mapa de agentes para lookup rápido
    const agentsMap = new Map(allAgents.map((agent: any) => [agent.id, agent]));
    console.log('🔍 [fetchUserAgentAssignments] Agents map keys:', Array.from(agentsMap.keys()));

    // Enriquecer datos con consultas separadas para usuarios y usar el mapa para agentes
    const enrichedAssignments: UserAgentAssignment[] = [];
    
    for (const assignment of assignments) {
      console.log('🔍 [fetchUserAgentAssignments] Processing assignment:', assignment);
      
      // Obtener usuario desde profiles (tabla que funciona)
      const { data: userDetails, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignment.user_id)
        .single();

      if (userError) {
        console.error('❌ [fetchUserAgentAssignments] Error fetching user:', userError);
      }

      // 🔧 USAR EL MAPA DE AGENTES (de la función que funciona)
      const agentDetails = agentsMap.get(assignment.agent_id);
      
      console.log('🔍 [fetchUserAgentAssignments] User details for', assignment.user_id, ':', userDetails);
      console.log('🔍 [fetchUserAgentAssignments] Agent details for', assignment.agent_id, ':', agentDetails);
      
      if (!agentDetails) {
        console.log('⚠️ [fetchUserAgentAssignments] No agent found for agent_id:', assignment.agent_id);
        console.log('⚠️ [fetchUserAgentAssignments] Available agent IDs:', Array.from(agentsMap.keys()));
      }

      enrichedAssignments.push({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary || false,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: userDetails ? {
          id: userDetails.id,
          email: userDetails.email,
          full_name: userDetails.full_name
        } : undefined,
        agent_details: agentDetails ? {
          id: agentDetails.id,
          retell_agent_id: agentDetails.id,
          name: agentDetails.name, // 🔧 NOMBRE REAL del agente que funciona
          description: agentDetails.description || 'Custom AI Agent',
          status: agentDetails.status || 'active'
        } : undefined
      });
    }

    console.log('🔍 [fetchUserAgentAssignments] Final enriched assignments:', enrichedAssignments.length);
    console.log('🔍 [fetchUserAgentAssignments] Final data:', enrichedAssignments);
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

    // 🔧 USAR fetchAgentsLocal también aquí
    const allAgents = await fetchAgentsLocal();
    const agentsMap = new Map(allAgents.map((agent: any) => [agent.id, agent]));

    // Enrich assignments with user and agent details
    const enrichedAssignments: UserAgentAssignment[] = [];
    
    for (const assignment of assignments) {
      console.log('🔍 [fetchCurrentUserAgentAssignments] Processing assignment:', assignment);
      
      // Obtener usuario desde profiles (tabla que funciona)
      const { data: userDetails, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', assignment.user_id)
        .single();

      if (userError) {
        console.error('❌ [fetchCurrentUserAgentAssignments] Error fetching user details:', userError);
      }

      // 🔧 USAR EL MAPA DE AGENTES
      const agentDetails = agentsMap.get(assignment.agent_id);

      console.log('🔍 [fetchCurrentUserAgentAssignments] User details:', userDetails);
      console.log('🔍 [fetchCurrentUserAgentAssignments] Agent details:', agentDetails);

      enrichedAssignments.push({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        is_primary: assignment.is_primary || false,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user_details: userDetails ? {
          id: userDetails.id,
          email: userDetails.email,
          full_name: userDetails.full_name
        } : undefined,
        agent_details: agentDetails ? {
          id: agentDetails.id,
          retell_agent_id: agentDetails.id,
          name: agentDetails.name,
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