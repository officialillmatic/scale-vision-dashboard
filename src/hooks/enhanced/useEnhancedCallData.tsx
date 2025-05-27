
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEnhancedCalls } from "@/services/enhanced/callService";
import { EnhancedCallData, CallFilters } from "@/lib/types/call-enhanced";
import { useCallSync } from "@/hooks/useCallSync";

export const useEnhancedCallData = (initialCalls: EnhancedCallData[] = []) => {
  const [filters, setFilters] = useState<CallFilters>({
    searchTerm: "",
    date: undefined,
    status: undefined,
    disposition: undefined
  });

  const { company, user } = useAuth();

  const { 
    data: fetchedCalls = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["enhanced-calls", company?.id, user?.id],
    queryFn: async (): Promise<EnhancedCallData[]> => {
      if (!company?.id || !user?.id) {
        console.log("[USE_ENHANCED_CALL_DATA] Missing required IDs", { 
          companyId: company?.id, 
          userId: user?.id 
        });
        return [];
      }
      
      try {
        return await fetchEnhancedCalls(company.id);
      } catch (error: any) {
        console.error("[USE_ENHANCED_CALL_DATA] Error fetching calls:", error);
        
        if (error?.message?.includes("permission denied")) {
          toast.error("Access denied. Please refresh the page and try again.");
        } else if (error?.code === "PGRST301") {
          console.log("[USE_ENHANCED_CALL_DATA] No calls found - this is normal for new accounts");
          return [];
        } else {
          toast.error("Failed to load calls. Please refresh the page.");
        }
        
        return [];
      }
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("permission denied") || 
          error?.message?.includes("relation") ||
          error?.code === '42501') {
        return false;
      }
      return failureCount < 2;
    }
  });

  const calls = fetchedCalls.length > 0 ? fetchedCalls : initialCalls;

  const { handleSync, isSyncing } = useCallSync(refetch);

  // Filter calls based on current filters
  const filteredCalls = calls.filter((call) => {
    const matchesSearch = !filters.searchTerm || 
      call.from?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      call.to?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      call.call_id?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (call.transcript && call.transcript.toLowerCase().includes(filters.searchTerm.toLowerCase()));

    const matchesDate = !filters.date ||
      new Date(call.timestamp).toDateString() === filters.date.toDateString();

    const matchesStatus = !filters.status || call.call_status === filters.status;
    const matchesDisposition = !filters.disposition || call.disposition === filters.disposition;

    return matchesSearch && matchesDate && matchesStatus && matchesDisposition;
  });

  // Sort calls by timestamp, most recent first
  const sortedAndFilteredCalls = [...filteredCalls].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const updateFilters = (newFilters: Partial<CallFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return {
    calls: sortedAndFilteredCalls,
    filters,
    updateFilters,
    isLoading,
    error,
    isSyncing,
    handleSync,
    refetch
  };
};
