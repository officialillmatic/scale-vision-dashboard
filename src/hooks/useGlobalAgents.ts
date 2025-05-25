
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "./useSuperAdmin";
import { Agent } from "@/services/agentService";

export const useGlobalAgents = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalAgents = async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Super admin can see all agents
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching global agents:", error);
        setError("Failed to load agents");
        setAgents([]);
      } else {
        setAgents(data || []);
      }
    } catch (error) {
      console.error("Error in global agents fetch:", error);
      setError("Failed to load agents");
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalAgents();
  }, [isSuperAdmin]);

  return {
    agents,
    isLoading,
    error,
    refetch: () => {
      if (isSuperAdmin) {
        fetchGlobalAgents();
      }
    }
  };
};
