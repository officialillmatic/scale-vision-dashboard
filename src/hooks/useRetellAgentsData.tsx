
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRetellAgents, RetellAgent } from "@/services/agent/retellAgentQueries";

export function useRetellAgentsData() {
  const [isUpdating, setIsUpdating] = useState(false);

  const { 
    data: retellAgents, 
    isLoading: isLoadingRetellAgents,
    refetch: refetchRetellAgents,
    error: retellAgentsError
  } = useQuery({
    queryKey: ['retell-agents'],
    queryFn: fetchRetellAgents,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  });

  console.log('🔍 [useRetellAgentsData] retellAgents result:', retellAgents);
  console.log('🔍 [useRetellAgentsData] retellAgents length:', retellAgents?.length);
  console.log('🔍 [useRetellAgentsData] retellAgentsError:', retellAgentsError);
  console.log('🔍 [useRetellAgentsData] isLoadingRetellAgents:', isLoadingRetellAgents);

  return {
    retellAgents: retellAgents || [],
    isLoadingRetellAgents,
    isUpdating,
    retellAgentsError,
    refetchRetellAgents
  };
}
