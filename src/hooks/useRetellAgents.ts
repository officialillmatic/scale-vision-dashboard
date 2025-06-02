
import { useState, useEffect } from 'react';
import { useRetellAgentSync } from './useRetellAgentSync';

export interface RetellAgentOption {
  retell_agent_id: string;
  name: string;
  display_text: string;
}

export function useRetellAgents() {
  const [agents, setAgents] = useState<RetellAgentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { unassignedAgents, isLoadingUnassigned } = useRetellAgentSync();

  const fetchAgents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the unassigned agents from the sync service
      if (unassignedAgents && unassignedAgents.length > 0) {
        const agentOptions: RetellAgentOption[] = unassignedAgents.map(agent => ({
          retell_agent_id: agent.retell_agent_id,
          name: agent.name,
          display_text: `${agent.name} (${agent.retell_agent_id})`
        }));
        
        setAgents(agentOptions);
        console.log('[USE_RETELL_AGENTS] Loaded', agentOptions.length, 'agents from sync service');
      } else {
        setAgents([]);
        console.log('[USE_RETELL_AGENTS] No unassigned agents available');
      }
    } catch (error: any) {
      console.error('[USE_RETELL_AGENTS] Error fetching agents:', error);
      setError(error.message || 'Failed to fetch agents');
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoadingUnassigned) {
      fetchAgents();
    }
  }, [unassignedAgents, isLoadingUnassigned]);

  return {
    agents,
    isLoading: isLoading || isLoadingUnassigned,
    error,
    refetch: fetchAgents
  };
}
