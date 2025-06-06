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

// [resto de las funciones permanecen igual...]