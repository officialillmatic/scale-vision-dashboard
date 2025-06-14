import { debugLog } from "@/lib/debug";

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
    refetchOnWindowFocus: true,
    retry: 2
  });

  debugLog('🔍 [useRetellAgentsData] retellAgents result:', retellAgents);
  debugLog('🔍 [useRetellAgentsData] retellAgents length:', retellAgents?.length);
  debugLog('🔍 [useRetellAgentsData] retellAgentsError:', retellAgentsError);
  debugLog('🔍 [useRetellAgentsData] isLoadingRetellAgents:', isLoadingRetellAgents);

  return {
    retellAgents: retellAgents || [],
    isLoadingRetellAgents,
    isUpdating,
    retellAgentsError,
    refetchRetellAgents
  };
}
