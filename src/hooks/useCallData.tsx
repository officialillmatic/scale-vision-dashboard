
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

  // Fetch calls from the database with improved error handling
  const { 
    data: calls = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["calls", company?.id, user?.id],
    queryFn: async () => {
      if (!company?.id || !user?.id) {
        console.log("[USE_CALL_DATA] Missing required IDs", { 
          companyId: company?.id, 
          userId: user?.id 
        });
        return [];
      }
      
      console.log("[USE_CALL_DATA] Fetching calls for company:", company.id);
      
      try {
        const result = await fetchCalls(company.id);
        console.log(`[USE_CALL_DATA] Successfully fetched ${result.length} calls`);
        return result;
      } catch (error: any) {
        console.error("[USE_CALL_DATA] Error fetching calls:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Show user-friendly error message
        if (error?.message?.includes("permission denied")) {
          toast.error("Access denied. Please check your permissions.");
        } else if (error?.code === "PGRST301") {
          console.log("[USE_CALL_DATA] No calls found - this is normal for new accounts");
        } else {
          toast.error("Failed to load calls. Please try again.");
        }
        
        throw error;
      }
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.message?.includes("permission denied")) {
        return false;
      }
      return failureCount < 2;
    },
    meta: {
      onError: (error: any) => {
        console.error("[USE_CALL_DATA] Query error:", error);
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
        
        // Test webhook monitor first
        const { data: monitorData, error: monitorError } = await supabase.functions.invoke("webhook-monitor");
        if (monitorError) {
          console.warn("[USE_CALL_DATA] Webhook monitor issue:", monitorError);
        }
        
        // Attempt the sync
        const { data, error } = await supabase.functions.invoke("sync-calls");
        
        if (error) {
          console.error("[USE_CALL_DATA] Sync error:", error);
          throw new Error(error.message || "Sync failed");
        }
        
        console.log("[USE_CALL_DATA] Sync response:", data);
        return data;
      } catch (error: any) {
        console.error("[USE_CALL_DATA] Sync exception:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_DATA] Sync successful:", data);
      const syncedCount = data?.synced_calls || 0;
      
      if (syncedCount > 0) {
        toast.success(`Successfully synced ${syncedCount} new calls`);
      } else {
        toast.info("Sync completed - no new calls found");
      }
      
      // Invalidate and refetch queries
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
      toast.error("Failed to sync calls. Please check your Retell integration.");
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
