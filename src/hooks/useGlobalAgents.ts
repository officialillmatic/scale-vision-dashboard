
import { useState, useEffect } from "react";
import { useSuperAdmin } from "./useSuperAdmin";
import { Agent } from "@/services/agentService";
import { fetchGlobalAgents } from "@/services/globalDataService";

export const useGlobalAgents = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    if (!isSuperAdmin) {
      setAgents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchGlobalAgents();
      setAgents(data);
    } catch (error: any) {
      console.error("Error fetching global agents:", error);
      setError("Failed to load agents");
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [isSuperAdmin]);

  return {
    agents,
    isLoading,
    error,
    refetch: () => {
      if (isSuperAdmin) {
        fetchAgents();
      }
    }
  };
};
