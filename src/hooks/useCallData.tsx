
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
        console.log("[USE_CALL_DATA] Missing company ID or user ID", { 
          companyId: company?.id, 
          userId: user?.id 
        });
        return [];
      }
      
      console.log("[USE_CALL_DATA] Fetching calls for company:", company.id);
      
      try {
        const result = await fetchCalls(company.id);
        console.log(`[USE_CALL_DATA] Successfully fetched ${result.length} calls`);
        
        if (result.length === 0) {
          console.log("[USE_CALL_DATA] No calls found - this might indicate:");
          console.log("- No calls have been made yet");
          console.log("- Webhook integration is not working");
          console.log("- RLS policies are blocking access");
          console.log("- Agent-company relationships are not set up");
        }
        
        return result;
      } catch (error: any) {
        console.error("[USE_CALL_DATA] Error fetching calls:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes (reduced for better debugging)
    retry: (failureCount, error) => {
      console.log(`[USE_CALL_DATA] Retry attempt ${failureCount} for error:`, error?.message);
      if (error?.message?.includes("permission denied")) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    meta: {
      onError: (error: any) => {
        console.error("[USE_CALL_DATA] Query error:", error);
        if (error?.message?.includes("permission denied")) {
          console.error("[USE_CALL_DATA] Permission denied - check RLS policies");
        }
      }
    }
  });

  // Enhanced sync calls mutation with better error handling
  const { 
    mutate: handleSync, 
    isPending: isSyncing 
  } = useMutation({
    mutationFn: async () => {
      try {
        console.log("[USE_CALL_DATA] Starting call sync...");
        
        // First test our webhook monitor
        const { data: monitorData, error: monitorError } = await supabase.functions.invoke("webhook-monitor");
        console.log("[USE_CALL_DATA] Webhook monitor status:", monitorData);
        
        // Then try the sync
        const { data, error } = await supabase.functions.invoke("sync-calls");
        
        if (error) {
          console.error("[USE_CALL_DATA] Sync error:", error);
          throw error;
        }
        
        console.log("[USE_CALL_DATA] Sync response:", data);
        
        // If no calls were synced, try to fetch directly from Retell
        if (data?.synced_calls === 0) {
          console.log("[USE_CALL_DATA] No calls synced, testing direct Retell fetch...");
          const { data: fetchData, error: fetchError } = await supabase.functions.invoke("fetch-retell-calls", {
            body: { limit: 10 }
          });
          
          if (fetchError) {
            console.error("[USE_CALL_DATA] Direct fetch error:", fetchError);
          } else {
            console.log("[USE_CALL_DATA] Direct fetch result:", fetchData);
          }
        }
        
        return data;
      } catch (error) {
        console.error("[USE_CALL_DATA] Sync exception:", error);
        return handleError(error, {
          fallbackMessage: "Failed to sync calls",
          showToast: false,
          logToConsole: true
        });
      }
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_DATA] Sync successful:", data);
      toast.success(`Sync completed: ${data?.synced_calls || 0} calls synchronized`);
      
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      
      // Force refetch after a short delay
      setTimeout(() => {
        refetch();
      }, 1000);
    },
    onError: (error: any) => {
      console.error("[USE_CALL_DATA] Sync mutation error:", error);
      toast.error(typeof error === 'string' ? error : "Failed to sync calls. Check console for details.");
    },
  });

  // Filter calls based on search term and date
  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      searchTerm === "" ||
      call.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
