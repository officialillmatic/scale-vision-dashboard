import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import {
  fetchAgents,
  fetchUserAgents,
  Agent,
  UserAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  assignAgentToUser,
  removeAgentFromUser
} from "@/services/agentService";
import { toast } from "sonner";

export function useAgents() {
  const { company, user } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const { isSuperAdmin } = useSuperAdmin();
  const isAdmin = isSuperAdmin || isCompanyOwner || can.manageAgents;
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const { 
    data: allAgents, 
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
    error: agentsError
  } = useQuery({
    queryKey: ['agents', company?.id, isSuperAdmin],
    queryFn: () => fetchAgents(isSuperAdmin ? undefined : company?.id),
    enabled: !!company?.id || isSuperAdmin
  });

  // LOGS DE DEBUG
  console.log('🔍 [useAgents] Raw allAgents data:', allAgents);
  console.log('🔍 [useAgents] allAgents length:', allAgents?.length);
  console.log('🔍 [useAgents] agentsError:', agentsError);
  console.log('🔍 [useAgents] isLoadingAgents:', isLoadingAgents);
  console.log('🔍 [useAgents] company?.id:', company?.id);
  console.log('🔍 [useAgents] isSuperAdmin:', isSuperAdmin);
  console.log('🔍 [useAgents] Query enabled:', !!company?.id || isSuperAdmin);


  const {
    data: userAgents,
    isLoading: isLoadingUserAgents,
    refetch: refetchUserAgents,
    error: userAgentsError
  } = useQuery({
    queryKey: ['user-agents', company?.id, isSuperAdmin],
    queryFn: () => {
      console.log('🔍 [useAgents] Calling fetchUserAgents with company?.id:', company?.id);
      console.log('🔍 [useAgents] isSuperAdmin:', isSuperAdmin);
      return fetchUserAgents(isSuperAdmin ? undefined : company?.id);
    },
    enabled: !!company?.id || isSuperAdmin,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  });

  console.log('🔍 [useAgents] userAgents result:', userAgents);
  console.log('🔍 [useAgents] userAgents length:', userAgents?.length);
  console.log('🔍 [useAgents] userAgentsError:', userAgentsError);
  console.log('🔍 [useAgents] company object:', company);
  console.log('🔍 [useAgents] isLoadingUserAgents:', isLoadingUserAgents);

  useEffect(() => {
    if (agentsError instanceof Error) {
      toast.error(agentsError.message);
    }
  }, [agentsError]);

  useEffect(() => {
    if (userAgentsError instanceof Error) {
      toast.error(userAgentsError.message);
    }
  }, [userAgentsError]);
  
  // Filter agents based on user role - super admins see all
  const agents = allAgents ? (isSuperAdmin || isAdmin 
    ? allAgents 
    : allAgents.filter(agent => {
        // Check if agent is assigned to current user
        return userAgents?.some(
          userAgent => userAgent.agent_id === agent.id && userAgent.user_id === user?.id
        );
      })
  ) : [];

  // LOG DE DEBUG PARA AGENTS FILTRADOS
  console.log('🔍 [useAgents] Filtered agents:', agents);
  console.log('🔍 [useAgents] isAdmin:', isAdmin);
  console.log('🔍 [useAgents] user?.id:', user?.id);

  // FUNCIONES CORREGIDAS PARA NOMBRES DE AGENTES
  const getAgentName = (agentId: string): string => {
    console.log('🔍 [getAgentName] Looking for agent ID:', agentId);
    console.log('🔍 [getAgentName] Available custom agents:', agents);
    console.log('🔍 [getAgentName] Raw allAgents for search:', allAgents);
    
    // CORREGIDO: Buscar por 'id' en lugar de 'retell_agent_id'
    const agent = agents?.find(a => a.id === agentId);
    console.log('🔍 [getAgentName] Found custom agent:', agent);
    
    if (agent) {
      console.log('🎯 [getAgentName] Returning agent name:', agent.name);
      return agent.name;
    }
    
    // FALLBACK: Buscar en allAgents sin filtros (por si hay problema de permisos)
    const agentInAll = allAgents?.find(a => a.id === agentId);
    console.log('🔍 [getAgentName] Found in allAgents (unfiltered):', agentInAll);
    
    if (agentInAll) {
      console.log('🎯 [getAgentName] Returning name from allAgents:', agentInAll.name);
      return agentInAll.name;
    }
    
    // Fallback para IDs que no están en el sistema
    console.log('⚠️ [getAgentName] No custom agent found, using fallback');
    if (agentId.length > 8) {
      return `Agent ${agentId.substring(0, 8)}`;
    }
    return `Agent ${agentId}`;
  };

  const getAgent = (agentId: string): Agent | undefined => {
    console.log('🔍 [getAgent] Looking for agent ID:', agentId);
    
    // CORREGIDO: Buscar por 'id' primero en agents filtrados
    let agent = agents?.find(agent => agent.id === agentId);
    
    // Si no se encuentra, buscar en allAgents
    if (!agent) {
      agent = allAgents?.find(agent => agent.id === agentId);
    }
    
    console.log('🔍 [getAgent] Found custom agent:', agent);
    return agent;
  };

  const getAgentList = () => {
    if (!agents) return [];
    
    return agents
      .map(agent => ({
        id: agent.id, // Este es el ID del Custom Agent
        name: agent.name,
        status: agent.status,
        description: agent.description,
        retell_agent_id: agent.retell_agent_id // Para debugging (si existe)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Función para obtener agentes únicos de una lista de llamadas
  // CORREGIDA: Las llamadas usan agent_id que corresponde al id del Custom Agent
  const getUniqueAgentsFromCalls = (calls: any[]) => {
    if (!calls || !agents) return [];
    
    // Obtener agent_ids únicos de las llamadas
    const uniqueAgentIds = [...new Set(calls.map(call => call.agent_id))];
    console.log('🔍 [getUniqueAgentsFromCalls] Unique agent IDs from calls:', uniqueAgentIds);
    console.log('🔍 [getUniqueAgentsFromCalls] Available agents to search in:', agents);
    
    return uniqueAgentIds
      .map(agentId => {
        // Buscar el Custom Agent que tiene este id
        let agent = agents.find(a => a.id === agentId);
        
        // Si no se encuentra en agents filtrados, buscar en allAgents
        if (!agent) {
          agent = allAgents?.find(a => a.id === agentId);
        }
        
        console.log(`🔍 [getUniqueAgentsFromCalls] For agent ID ${agentId}, found custom agent:`, agent);
        
        return {
          id: agentId, // Para el filtro, usamos el agent_id
          name: agent ? agent.name : getAgentName(agentId),
          customAgentId: agent?.id, // ID del Custom Agent
          retell_agent_id: agent?.retell_agent_id // Si existe
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleCreateAgent = async (agentData: Partial<Agent>) => {
    if (!isSuperAdmin && !isAdmin) return false;
    
    setIsCreating(true);
    try {
      const newAgent = await createAgent(agentData);
      if (newAgent) {
        refetchAgents();
        return true;
      }
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAgent = async (id: string, agentData: Partial<Agent>) => {
    if (!isSuperAdmin && !isAdmin) return false;
    
    setIsUpdating(true);
    try {
      const result = await updateAgent(id, agentData);
      if (result) {
        refetchAgents();
        return true;
      }
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!isSuperAdmin && !isAdmin) return false;
    
    setIsDeleting(true);
    try {
      const success = await deleteAgent(id);
      if (success) {
        refetchAgents();
        return true;
      }
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignAgent = async (userAgentData: Partial<UserAgent>) => {
    if (!isSuperAdmin && !isAdmin) {
      return false;
    }

    // Super admins can assign agents even without a specific company
    const targetCompanyId = company?.id || userAgentData.company_id;
    if (!targetCompanyId && !isSuperAdmin) {
      return false;
    }

    setIsAssigning(true);
    try {
      const newUserAgent = await assignAgentToUser({
        ...userAgentData,
        company_id: targetCompanyId
      });
      if (newUserAgent) {
        refetchUserAgents();
        return true;
      }
      return false;
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAgentAssignment = async (id: string) => {
    if (!isSuperAdmin && !isAdmin) return false;
    
    setIsAssigning(true);
    try {
      const success = await removeAgentFromUser(id);
      if (success) {
        refetchUserAgents();
        return true;
      }
      return false;
    } finally {
      setIsAssigning(false);
    }
  };

  return {
    agents,
    userAgents: userAgents || [],
    isLoadingAgents,
    isLoadingUserAgents,
    isCreating,
    isUpdating,
    isDeleting,
    isAssigning,
    agentsError,
    userAgentsError,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleAssignAgent,
    handleRemoveAgentAssignment,
    refetchAgents,
    refetchUserAgents,
    isAdmin: isSuperAdmin || isAdmin,
    // FUNCIONES CORREGIDAS PARA MY CALLS:
    getAgentName,        // Busca por id y retorna nombre del Custom Agent
    getAgent,           // Busca por id y retorna Custom Agent completo
    getAgentList,       // Lista de Custom Agents
    getUniqueAgentsFromCalls // Agentes únicos de llamadas (usando agent_id)
  };
}