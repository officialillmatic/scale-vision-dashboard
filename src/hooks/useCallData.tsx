
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCalls, CallData } from "@/services/callService";
import { useAuth } from "@/contexts/AuthContext";

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
    queryFn: async (): Promise<CallData[]> => {
      if (!company?.id || !user?.id) {
        console.log("[USE_CALL_DATA] Missing required IDs", { 
          companyId: company?.id, 
          userId: user?.id 
        });
        return [];
      }
      
      console.log("[USE_CALL_DATA] Fetching calls for company:", company.id);
      
      try {
        // Use proper headers for Supabase requests
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            agent:agent_id (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', company.id)
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("[USE_CALL_DATA] Database error:", error);
          if (error.code === 'PGRST301') {
            console.log("[USE_CALL_DATA] No calls found - returning empty array");
            return [];
          }
          throw error;
        }
        
        if (!data) {
          console.log("[USE_CALL_DATA] No call data returned");
          return [];
        }
        
        // Transform the data to ensure proper date objects
        const transformedCalls: CallData[] = data.map((call) => ({
          ...call,
          timestamp: new Date(call.timestamp),
          start_time: call.start_time ? new Date(call.start_time) : undefined,
        }));
        
        console.log(`[USE_CALL_DATA] Successfully fetched ${transformedCalls.length} calls`);
        return transformedCalls;
      } catch (error: any) {
        console.error("[USE_CALL_DATA] Error fetching calls:", error);
        
        // Show user-friendly error messages
        if (error?.message?.includes("permission denied")) {
          toast.error("Access denied. Please check your permissions.");
        } else if (error?.code === "PGRST301") {
          console.log("[USE_CALL_DATA] No calls found - this is normal for new accounts");
          return [];
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
        
        const { data, error } = await supabase.functions.invoke("sync-calls", {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
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
