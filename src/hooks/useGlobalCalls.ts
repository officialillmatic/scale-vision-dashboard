
import { useState, useEffect } from "react";
import { useSuperAdmin } from "./useSuperAdmin";
import { CallData } from "@/services/callService";
import { fetchGlobalCalls } from "@/services/globalDataService";

export const useGlobalCalls = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalls = async () => {
    if (!isSuperAdmin) {
      setCalls([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchGlobalCalls();
      setCalls(data);
    } catch (error: any) {
      console.error("Error fetching global calls:", error);
      setError("Failed to load calls");
      setCalls([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [isSuperAdmin]);

  return {
    calls,
    isLoading,
    error,
    refetch: () => {
      if (isSuperAdmin) {
        fetchCalls();
      }
    }
  };
};
