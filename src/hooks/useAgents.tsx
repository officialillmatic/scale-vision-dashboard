
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
  const { company } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const { 
    data: agents, 
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
    error: agentsError
  } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(),
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

  const handleCreateAgent = async (agentData: Partial<Agent>) => {
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
    if (!company?.id) {
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
    agents: agents || [],
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
