// services/agentService.ts
// Main agent service - exports all functionality from modular files

// 🔄 EXPORTACIONES EXISTENTES (mantener como están)
export type { Agent, UserAgent } from "./agent/agentTypes";
export {
  fetchAgents,
  fetchUserAgents,
  fetchUserAccessibleAgents,
  fetchCompanyUserAgents
} from "./agent/agentQueries";
export {
  createAgent,
  updateAgent,
  deleteAgent,
  assignAgentToUser,
  removeAgentFromUser,
  updateUserAgentPrimary
} from "./agent/agentMutations";

// ========================================
// 🆕 NUEVAS FUNCIONALIDADES PARA TEAMPAGE
// ========================================

// 🆕 NUEVAS INTERFACES PARA RETELL API
export interface RetellAgentDetailed {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  response_engine: {
    type: string;
    llm_id: string;
  };
  llm_websocket_url: string;
  created_time: number;
  last_modification_time: number;
}

export interface RetellAgentListResponse {
  agents: RetellAgentDetailed[];
  has_more: boolean;
  next_pagination_key?: string;
}

// 🆕 FUNCIONES PARA INTEGRACIÓN CON RETELL API (TEAMPAGE)

/**
 * 📡 Obtener todos los agentes directamente de Retell API
 * Específicamente para uso en TeamPage y gestión de equipos
 */
export async function getAllRetellAgentsForTeam(): Promise<RetellAgentDetailed[]> {
  try {
    console.log('🔍 [TeamPage] Fetching agents from Retell API...');
    
    const apiKey = process.env.NEXT_PUBLIC_RETELL_API_KEY;
    if (!apiKey) {
      throw new Error('RETELL_API_KEY no está configurado');
    }

    const response = await fetch('https://api.retellai.com/v2/list-agents', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Retell API error: ${response.status} ${response.statusText}`);
    }

    const data: RetellAgentListResponse = await response.json();
    console.log('✅ [TeamPage] Retell agents fetched:', data.agents?.length || 0);
    
    return data.agents || [];
  } catch (error) {
    console.error('❌ [TeamPage] Error fetching Retell agents:', error);
    throw error;
  }
}

/**
 * 🔍 Obtener un agente específico de Retell API
 * Para mostrar detalles completos en TeamPage
 */
export async function getRetellAgentDetailsForTeam(agentId: string): Promise<RetellAgentDetailed> {
  try {
    console.log('🔍 [TeamPage] Fetching agent details from Retell:', agentId);
    
    const apiKey = process.env.NEXT_PUBLIC_RETELL_API_KEY;
    if (!apiKey) {
      throw new Error('RETELL_API_KEY no está configurado');
    }

    const response = await fetch(`https://api.retellai.com/v2/get-agent/${agentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Retell API error: ${response.status} ${response.statusText}`);
    }

    const agent: RetellAgentDetailed = await response.json();
    console.log('✅ [TeamPage] Agent details fetched:', agent.agent_name);
    
    return agent;
  } catch (error) {
    console.error('❌ [TeamPage] Error fetching agent details:', error);
    throw error;
  }
}

/**
 * ✅ Verificar si un agente existe en Retell
 * Para validación antes de agregar agentes en TeamPage
 */
export async function verifyRetellAgentExists(agentId: string): Promise<boolean> {
  try {
    await getRetellAgentDetailsForTeam(agentId);
    return true;
  } catch (error) {
    console.error('❌ [TeamPage] Agent verification failed:', error);
    return false;
  }
}

/**
 * 🔄 Sincronizar agente local con datos de Retell
 * Para actualizar información desde Retell API
 */
export async function syncAgentWithRetell(localAgentId: string, retellAgentId: string): Promise<RetellAgentDetailed | null> {
  try {
    console.log('🔄 [TeamPage] Syncing agent with Retell:', { localAgentId, retellAgentId });
    
    // Obtener datos actualizados de Retell
    const retellAgent = await getRetellAgentDetailsForTeam(retellAgentId);
    
    console.log('✅ [TeamPage] Agent sync data retrieved:', retellAgent.agent_name);
    return retellAgent;
    
  } catch (error) {
    console.error('❌ [TeamPage] Error syncing agent with Retell:', error);
    return null;
  }
}

/**
 * 📊 Obtener estadísticas de uso de un agente desde Retell
 * Para mostrar métricas en TeamPage (si están disponibles en la API)
 */
export async function getRetellAgentStats(agentId: string): Promise<{
  total_calls?: number;
  last_activity?: string;
  status: string;
} | null> {
  try {
    // Por ahora, solo verificamos que el agente existe
    const agent = await getRetellAgentDetailsForTeam(agentId);
    
    return {
      status: 'active',
      last_activity: new Date(agent.last_modification_time).toISOString(),
      total_calls: 0 // Este dato tendría que venir de otra fuente o endpoint
    };
    
  } catch (error) {
    console.error('❌ [TeamPage] Error getting agent stats:', error);
    return null;
  }
}
