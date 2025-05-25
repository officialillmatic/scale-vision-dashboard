
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "./useSuperAdmin";
import { CallData } from "@/services/callService";

export const useGlobalCalls = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalCalls = async () => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Super admin can see all calls from all companies
      const { data, error } = await supabase
        .from("calls")
        .select(`
          *,
          agent:agent_id (
            id,
            name,
            rate_per_minute,
            retell_agent_id
          )
        `)
        .order("timestamp", { ascending: false })
        .limit(1000); // Limit for performance

      if (error) {
        console.error("Error fetching global calls:", error);
        setError("Failed to load calls");
        setCalls([]);
      } else {
        setCalls(data || []);
      }
    } catch (error) {
      console.error("Error in global calls fetch:", error);
      setError("Failed to load calls");
      setCalls([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalCalls();
  }, [isSuperAdmin]);

  return {
    calls,
    isLoading,
    error,
    refetch: () => {
      if (isSuperAdmin) {
        fetchGlobalCalls();
      }
    }
  };
};
