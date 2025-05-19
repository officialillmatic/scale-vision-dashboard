
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
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
  const isAdmin = isCompanyOwner || can.manageAgents;
  
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
    queryKey: ['agents'],
    queryFn: () => fetchAgents(company?.id),
  });

  const {
    data: userAgents,
    isLoading: isLoadingUserAgents,
    refetch: refetchUserAgents,
    error: userAgentsError
  } = useQuery({
    queryKey: ['user-agents', company?.id],
    queryFn: () => fetchUserAgents(company?.id),
    enabled: !!company?.id
  });
  
  // Filter agents based on user role
  const agents = allAgents ? (isAdmin 
    ? allAgents 
    : allAgents.filter(agent => {
        // Check if agent is assigned to current user
        return userAgents?.some(
          userAgent => userAgent.agent_id === agent.id && userAgent.user_id === user?.id
        );
      })
  ) : [];

  const handleCreateAgent = async (agentData: Partial<Agent>) => {
    if (!isAdmin) return false;
    
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
    if (!isAdmin) return false;
    
    setIsUpdating(true);
    try {
      const success = await updateAgent(id, agentData);
      if (success) {
        refetchAgents();
        return true;
      }
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!isAdmin) return false;
    
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
    if (!isAdmin || !company?.id) {
      return false;
    }

    setIsAssigning(true);
    try {
      const newUserAgent = await assignAgentToUser({
        ...userAgentData,
        company_id: company.id
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
    if (!isAdmin) return false;
    
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
    handleRemoveAgentAssignment
  };
}
