// services/agentService.ts - PARTE 1
// Main agent service - exports all functionality from modular files

// ========================================
// 🔄 EXPORTACIONES EXISTENTES (mantener como están)
// ========================================
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
// 🆕 NUEVAS INTERFACES PARA RETELL API
// ========================================

export interface RetellAgentDetailed {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  created_time: number;
  last_modification_time: number;
  response_engine: {
    type: string;
    llm_id?: string;
    llm_websocket_url?: string;
    begin_message?: string;
    general_prompt?: string;
    general_tools?: any[];
    starting_state?: string;
    states?: any[];
  };
  llm_websocket_url?: string;
  voice_temperature?: number;
  voice_speed?: number;
  volume?: number;
  enable_backchannel?: boolean;
  ambient_sound?: string;
  ambient_sound_volume?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  interruption_threshold?: number;
  enable_voicemail_detection?: boolean;
  opt_out_sensitive_data_storage?: boolean;
  webhook_url?: string;
  boosted_keywords?: string[];
  enable_transcription_formatting?: boolean;
  post_call_analysis_data?: any[];
  pronunciation_dictionary?: any[];
  normalize_for_speech?: boolean;
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  voicemail_message?: string;
  voicemail_detection_timeout_ms?: number;
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
}

export interface RetellAgentListResponse {
  agents: RetellAgentDetailed[];
  has_more: boolean;
  next_pagination_key?: string;
}

export interface RetellApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}
// services/agentService.ts - PARTE 2
// Configuración y utilidades de red

// ========================================
// CONFIGURACIÓN Y CONSTANTES
// ========================================

const RETELL_API_BASE_URL = 'https://api.retellai.com/v2';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

/**
 * Obtiene la API key de Retell desde las variables de entorno
 * Compatible con Vite y Next.js
 */
function getRetellApiKey(): string {
  // Intenta primero con Vite, luego con Next.js
  const apiKey = import.meta.env?.VITE_RETELL_API_KEY || 
                 process.env.NEXT_PUBLIC_RETELL_API_KEY || 
                 process.env.RETELL_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ RETELL_API_KEY no está configurada en las variables de entorno');
    throw new Error('RETELL_API_KEY no está configurada');
  }
  return apiKey;
}

/**
 * Obtiene los headers necesarios para las peticiones a Retell API
 */
function getRetellHeaders(): HeadersInit {
  try {
    const apiKey = getRetellApiKey();
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  } catch (error) {
    console.error('❌ Error obteniendo headers de Retell:', error);
    throw error;
  }
}

// ========================================
// UTILIDADES DE RED
// ========================================

/**
 * Función helper para realizar peticiones HTTP con reintentos
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 [Retell API] Intento ${attempt + 1}/${retries + 1}: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, options);

      if (response.ok) {
        console.log(`✅ [Retell API] Petición exitosa: ${response.status}`);
        return response;
      }

      // Si es un error 4xx, no reintentamos
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      // Para errores 5xx, continuamos con reintentos
      console.warn(`⚠️ [Retell API] Error ${response.status}, reintentando...`);
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

    } catch (error: any) {
      console.warn(`⚠️ [Retell API] Error en intento ${attempt + 1}:`, error.message);
      lastError = error;

      // Si no es el último intento, esperamos antes de reintentar
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Error desconocido en petición a Retell API');
}
// services/agentService.ts - PARTE 3
// Funciones principales para TeamPage

// ========================================
// 🆕 FUNCIONES PARA INTEGRACIÓN CON RETELL API (TEAMPAGE)
// ========================================

/**
 * 📡 Obtener todos los agentes directamente de Retell API
 * Específicamente para uso en TeamPage y gestión de equipos
 */
export async function getAllRetellAgentsForTeam(): Promise<RetellAgentDetailed[]> {
  try {
    console.log('🔍 [TeamPage] Fetching agents from Retell API...');
    
    const response = await fetchWithRetry(`${RETELL_API_BASE_URL}/list-agents`, {
      method: 'GET',
      headers: getRetellHeaders()
    });

    const data = await response.json();
    console.log('📦 [TeamPage] Respuesta de Retell:', data);

    // Retell puede devolver un array directamente o dentro de una propiedad
    let agents: RetellAgentDetailed[] = [];
    
    if (Array.isArray(data)) {
      agents = data;
    } else if (data.agents && Array.isArray(data.agents)) {
      agents = data.agents;
    } else if (data.data && Array.isArray(data.data)) {
      agents = data.data;
    }

    console.log(`✅ [TeamPage] ${agents.length} agentes obtenidos exitosamente`);
    return agents;

  } catch (error: any) {
    console.error('❌ [TeamPage] Error fetching Retell agents:', error);
    
    // Si es un error de autenticación, lo manejamos específicamente
    if (error.message.includes('401') || error.message.includes('403')) {
      throw new Error('Error de autenticación con Retell AI. Verifica tu API key.');
    }
    
    // Para otros errores, devolvemos un array vacío para no romper la UI
    console.warn('🔄 [TeamPage] Devolviendo array vacío debido al error');
    return [];
  }
}

/**
 * 🔍 Obtener un agente específico de Retell API
 * Para mostrar detalles completos en TeamPage
 */
export async function getRetellAgentDetailsForTeam(agentId: string): Promise<RetellAgentDetailed> {
  try {
    console.log('🔍 [TeamPage] Fetching agent details from Retell:', agentId);
    
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID de agente no válido');
    }

    const response = await fetchWithRetry(`${RETELL_API_BASE_URL}/get-agent/${agentId}`, {
      method: 'GET',
      headers: getRetellHeaders()
    });

    const agentData = await response.json() as RetellAgentDetailed;
    
    console.log(`✅ [TeamPage] Agent details fetched:`, agentData.agent_name);
    return agentData;

  } catch (error: any) {
    console.error(`❌ [TeamPage] Error fetching agent details for ${agentId}:`, error);
    throw new Error(`No se pudieron obtener los detalles del agente: ${error.message}`);
  }
}

/**
 * ✅ Verificar si un agente existe en Retell
 * Para validación antes de agregar agentes en TeamPage
 */
export async function verifyRetellAgentExists(agentId: string): Promise<boolean> {
  try {
    console.log(`🔍 [TeamPage] Verificando existencia del agente: ${agentId}`);

    if (!agentId || agentId.trim() === '') {
      return false;
    }

    await getRetellAgentDetailsForTeam(agentId);
    
    console.log(`✅ [TeamPage] Agente ${agentId} existe`);
    return true;

  } catch (error: any) {
    console.log(`❌ [TeamPage] Agente ${agentId} no existe o no es accesible:`, error.message);
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
// services/agentService.ts - PARTE 4
// Funciones CRUD adicionales para Retell API

// ========================================
// FUNCIONES ADICIONALES DE RETELL API
// ========================================

/**
 * Crea un nuevo agente en Retell AI
 */
export async function createRetellAgent(agentData: {
  agent_name: string;
  voice_id: string;
  language?: string;
  response_engine?: any;
}): Promise<RetellAgentDetailed> {
  try {
    console.log('🔧 [AgentService] Creando nuevo agente en Retell:', agentData.agent_name);

    const payload = {
      agent_name: agentData.agent_name,
      voice_id: agentData.voice_id,
      language: agentData.language || 'en-US',
      response_engine: agentData.response_engine || {
        type: 'retell-llm',
        llm_id: 'gpt-3.5-turbo'
      }
    };

    const response = await fetchWithRetry(`${RETELL_API_BASE_URL}/create-agent`, {
      method: 'POST',
      headers: getRetellHeaders(),
      body: JSON.stringify(payload)
    });

    const newAgent = await response.json() as RetellAgentDetailed;
    
    console.log(`✅ [AgentService] Agente creado exitosamente: ${newAgent.agent_id}`);
    return newAgent;

  } catch (error: any) {
    console.error('❌ [AgentService] Error creando agente en Retell:', error);
    throw new Error(`No se pudo crear el agente: ${error.message}`);
  }
}

/**
 * Actualiza un agente existente en Retell AI
 */
export async function updateRetellAgent(
  agentId: string, 
  updateData: Partial<RetellAgentDetailed>
): Promise<RetellAgentDetailed> {
  try {
    console.log(`🔧 [AgentService] Actualizando agente ${agentId}`);

    const response = await fetchWithRetry(`${RETELL_API_BASE_URL}/update-agent/${agentId}`, {
      method: 'PATCH',
      headers: getRetellHeaders(),
      body: JSON.stringify(updateData)
    });

    const updatedAgent = await response.json() as RetellAgentDetailed;
    
    console.log(`✅ [AgentService] Agente ${agentId} actualizado exitosamente`);
    return updatedAgent;

  } catch (error: any) {
    console.error(`❌ [AgentService] Error actualizando agente ${agentId}:`, error);
    throw new Error(`No se pudo actualizar el agente: ${error.message}`);
  }
}

/**
 * Elimina un agente de Retell AI
 */
export async function deleteRetellAgent(agentId: string): Promise<void> {
  try {
    console.log(`🗑️ [AgentService] Eliminando agente ${agentId}`);

    await fetchWithRetry(`${RETELL_API_BASE_URL}/delete-agent/${agentId}`, {
      method: 'DELETE',
      headers: getRetellHeaders()
    });

    console.log(`✅ [AgentService] Agente ${agentId} eliminado exitosamente`);

  } catch (error: any) {
    console.error(`❌ [AgentService] Error eliminando agente ${agentId}:`, error);
    throw new Error(`No se pudo eliminar el agente: ${error.message}`);
  }
}

/**
 * Obtiene las voces disponibles en Retell AI
 */
export async function getAvailableVoices(): Promise<any[]> {
  try {
    console.log('🎵 [AgentService] Obteniendo voces disponibles...');

    const response = await fetchWithRetry(`${RETELL_API_BASE_URL}/list-voices`, {
      method: 'GET',
      headers: getRetellHeaders()
    });

    const voices = await response.json();
    
    console.log(`✅ [AgentService] ${voices.length || 0} voces obtenidas`);
    return Array.isArray(voices) ? voices : voices.data || [];

  } catch (error: any) {
    console.error('❌ [AgentService] Error obteniendo voces:', error);
    return [];
  }
}

/**
 * Obtiene los modelos LLM disponibles en Retell AI
 */
export async function getAvailableLLMs(): Promise<any[]> {
  try {
    console.log('🧠 [AgentService] Obteniendo modelos LLM disponibles...');

    const response = await fetchWithRetry(`${RETELL_API_BASE_URL}/list-llms`, {
      method: 'GET',
      headers: getRetellHeaders()
    });

    const llms = await response.json();
    
    console.log(`✅ [AgentService] ${llms.length || 0} modelos LLM obtenidos`);
    return Array.isArray(llms) ? llms : llms.data || [];

  } catch (error: any) {
    console.error('❌ [AgentService] Error obteniendo modelos LLM:', error);
    return [];
  }
}

/**
 * Prueba la conectividad con la API de Retell
 */
export async function testRetellConnection(): Promise<RetellApiResponse<string>> {
  try {
    console.log('🔌 [AgentService] Probando conexión con Retell API...');

    // Intentamos obtener la lista de agentes como prueba de conectividad
    const agents = await getAllRetellAgentsForTeam();
    
    return {
      success: true,
      data: `Conexión exitosa. ${agents.length} agentes encontrados.`
    };

  } catch (error: any) {
    console.error('❌ [AgentService] Error en prueba de conexión:', error);
    
    return {
      success: false,
      error: error.message,
      status: error.status || 500
    };
  }
}
// services/agentService.ts - PARTE 5
// Funciones auxiliares y exports finales

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Formatea la información básica de un agente para mostrar en UI
 */
export function formatAgentForDisplay(agent: RetellAgentDetailed): {
  id: string;
  name: string;
  voice: string;
  language: string;
  created: string;
  lastModified: string;
  engine: string;
} {
  return {
    id: agent.agent_id,
    name: agent.agent_name,
    voice: agent.voice_id,
    language: agent.language,
    created: new Date(agent.created_time).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    lastModified: new Date(agent.last_modification_time).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    engine: agent.response_engine?.type || 'N/A'
  };
}

/**
 * Valida los datos de un agente antes de enviarlos a Retell
 */
export function validateAgentData(agentData: Partial<RetellAgentDetailed>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!agentData.agent_name || agentData.agent_name.trim().length === 0) {
    errors.push('El nombre del agente es requerido');
  }

  if (!agentData.voice_id || agentData.voice_id.trim().length === 0) {
    errors.push('El ID de voz es requerido');
  }

  if (agentData.agent_name && agentData.agent_name.length > 100) {
    errors.push('El nombre del agente no puede exceder 100 caracteres');
  }

  if (agentData.language && !['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR'].includes(agentData.language)) {
    errors.push('Idioma no soportado');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Convierte un timestamp de Retell a una fecha legible
 */
export function formatRetellTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Genera un resumen corto de las capacidades de un agente
 */
export function generateAgentSummary(agent: RetellAgentDetailed): string {
  const parts = [
    `Voz: ${agent.voice_id}`,
    `Idioma: ${agent.language}`,
    `Motor: ${agent.response_engine?.type || 'N/A'}`
  ];
  
  if (agent.response_engine?.llm_id) {
    parts.push(`LLM: ${agent.response_engine.llm_id}`);
  }
  
  return parts.join(' • ');
}

/**
 * Verifica si un agente tiene configuración completa
 */
export function isAgentFullyConfigured(agent: RetellAgentDetailed): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!agent.agent_name) missingFields.push('Nombre');
  if (!agent.voice_id) missingFields.push('Voz');
  if (!agent.language) missingFields.push('Idioma');
  if (!agent.response_engine?.type) missingFields.push('Motor de respuesta');
  
  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
}

/**
 * Calcula el tiempo transcurrido desde la última modificación
 */
export function getTimeSinceLastModification(agent: RetellAgentDetailed): string {
  const now = Date.now();
  const diff = now - agent.last_modification_time;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    return 'Hace menos de una hora';
  }
}

// ========================================
// CONSTANTES ÚTILES
// ========================================

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'Inglés (Estados Unidos)' },
  { code: 'es-ES', name: 'Español (España)' },
  { code: 'es-MX', name: 'Español (México)' },
  { code: 'fr-FR', name: 'Francés' },
  { code: 'de-DE', name: 'Alemán' },
  { code: 'it-IT', name: 'Italiano' },
  { code: 'pt-BR', name: 'Portugués (Brasil)' }
];

export const COMMON_VOICE_SETTINGS = {
  temperature: { min: 0, max: 2, default: 1, step: 0.1 },
  speed: { min: 0.5, max: 2, default: 1, step: 0.1 },
  volume: { min: 0, max: 1, default: 0.8, step: 0.1 }
};

// ========================================
// EXPORTS POR DEFECTO
// ========================================

export default {
  // Funciones principales
  getAllRetellAgentsForTeam,
  getRetellAgentDetailsForTeam,
  verifyRetellAgentExists,
  syncAgentWithRetell,
  getRetellAgentStats,
  
  // CRUD operations
  createRetellAgent,
  updateRetellAgent,
  deleteRetellAgent,
  
  // Utilidades
  getAvailableVoices,
  getAvailableLLMs,
  testRetellConnection,
  
  // Helpers
  formatAgentForDisplay,
  validateAgentData,
  formatRetellTimestamp,
  generateAgentSummary,
  isAgentFullyConfigured,
  getTimeSinceLastModification,
  
  // Constantes
  SUPPORTED_LANGUAGES,
  COMMON_VOICE_SETTINGS
};
