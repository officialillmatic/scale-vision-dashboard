
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCalls, CallData } from "@/services/callService";
import { useAuth } from "@/contexts/AuthContext";
import { handleError } from "@/lib/errorHandling";

export const useCallData = (initialCalls: CallData[] = []) => {
  const { company, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  // Fetch calls from the database with proper filtering
  const { 
    data: calls = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["calls", company?.id, user?.id],
    queryFn: async () => {
      if (!company?.id || !user?.id) {
        console.log("[USE_CALL_DATA] Missing company ID or user ID");
        return [];
      }
      
      console.log("[USE_CALL_DATA] Fetching calls for company:", company.id);
      const result = await fetchCalls(company.id);
      console.log(`[USE_CALL_DATA] Fetched ${result.length} calls`);
      return result;
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Only retry twice for permission errors
      if (error?.message?.includes("permission denied")) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    meta: {
      onError: (error: any) => {
        console.error("[USE_CALL_DATA] Error fetching calls:", error);
      }
    }
  });

  // Sync calls mutation
  const { 
    mutate: handleSync, 
    isPending: isSyncing 
  } = useMutation({
    mutationFn: async () => {
      try {
        console.log("[USE_CALL_DATA] Starting call sync");
        const { data, error } = await supabase.functions.invoke("sync-calls");
        if (error) {
          console.error("[USE_CALL_DATA] Sync error:", error);
          throw error;
        }
        console.log("[USE_CALL_DATA] Sync response:", data);
      } catch (error) {
        console.error("[USE_CALL_DATA] Sync exception:", error);
        return handleError(error, {
          fallbackMessage: "Failed to sync calls",
          showToast: false,
          logToConsole: true
        });
      }
    },
    onSuccess: () => {
      console.log("[USE_CALL_DATA] Sync successful, invalidating queries");
      toast.success("Calls synchronized successfully");
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (error: any) => {
      console.error("[USE_CALL_DATA] Sync mutation error:", error);
      toast.error(typeof error === 'string' ? error : "Failed to sync calls");
    },
  });

  // Filter calls based on search term and date
  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      searchTerm === "" ||
      call.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.transcript && call.transcript.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDate =
      !date ||
      new Date(call.timestamp).toDateString() === date.toDateString();

    return matchesSearch && matchesDate;
  });

  // Sort calls by timestamp, most recent first
  const sortedCalls = [...filteredCalls].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    calls: sortedCalls,
    isLoading,
    error,
    isSyncing,
    searchTerm,
    setSearchTerm,
    date,
    setDate,
    handleSync,
    refetch
  };
};
