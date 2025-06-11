import { useState } from "react";
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

  // NUEVAS FUNCIONES PARA NOMBRES DE AGENTES
  const getAgentName = (agentId: string): string => {
    const agent = agents?.find(a => a.id === agentId);
    if (agent) return agent.name;
    
    // Fallback para IDs que no están en el sistema
    if (agentId.length > 8) {
      return `Agent ${agentId.substring(0, 8)}`;
    }
    return `Agent ${agentId}`;
  };

  const getAgent = (agentId: string): Agent | undefined => {
    return agents?.find(agent => agent.id === agentId);
  };

  const getAgentList = () => {
    if (!agents) return [];
    
    return agents
      .map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        description: agent.description
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // Función para obtener agentes únicos de una lista de llamadas
  const getUniqueAgentsFromCalls = (calls: any[]) => {
  if (!calls || !agents) return [];
  
  const uniqueAgentIds = [...new Set(calls.map(call => call.agent_id))];
  
  return uniqueAgentIds
    .map(agentId => {
      const agent = agents.find(a => a.id === agentId);
      return {
        id: agentId,
        name: agent ? agent.name : getAgentName(agentId),
        // Agregar estas propiedades que faltan:
        rate_per_minute: agent?.rate_per_minute,
        retell_agent_id: agent?.retell_agent_id
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
    // NUEVAS FUNCIONES PARA MY CALLS:
    getAgentName,
    getAgent,
    getAgentList,
    getUniqueAgentsFromCalls
  };
}