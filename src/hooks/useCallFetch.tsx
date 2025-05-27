
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CallData } from "@/services/callService";
import { useAuth } from "@/contexts/AuthContext";

export const useCallFetch = () => {
  const { company, user } = useAuth();

  const { 
    data: calls = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["calls", company?.id, user?.id],
    queryFn: async (): Promise<CallData[]> => {
      if (!company?.id || !user?.id) {
        console.log("[USE_CALL_FETCH] Missing required IDs", { 
          companyId: company?.id, 
          userId: user?.id 
        });
        return [];
      }
      
      console.log("[USE_CALL_FETCH] Fetching calls for company:", company.id);
      
      try {
        // Use the proper foreign key constraint established in migration
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            call_agent:agents!calls_agent_id_fkey (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', company.id)
          .order('timestamp', { ascending: false })
          .limit(100);
          
        if (error) {
          console.error("[USE_CALL_FETCH] Database error:", error);
          
          // Handle specific error types
          if (error.code === 'PGRST301' || error.message?.includes('no rows')) {
            console.log("[USE_CALL_FETCH] No calls found - returning empty array");
            return [];
          }
          
          if (error.message?.includes('permission denied') || error.code === '42501') {
            console.error("[USE_CALL_FETCH] Permission denied error");
            toast.error("Access denied. Your session may have expired. Please refresh the page.");
            return [];
          }
          
          throw error;
        }
        
        if (!data) {
          console.log("[USE_CALL_FETCH] No call data returned");
          return [];
        }
        
        // Transform the data to ensure proper date objects and agent structure
        const transformedCalls: CallData[] = data.map((call) => ({
          ...call,
          timestamp: new Date(call.timestamp),
          start_time: call.start_time ? new Date(call.start_time) : undefined,
          // Map call_agent to agent for compatibility
          agent: call.call_agent ? {
            id: call.call_agent.id,
            name: call.call_agent.name,
            rate_per_minute: call.call_agent.rate_per_minute
          } : undefined
        }));
        
        console.log(`[USE_CALL_FETCH] Successfully fetched ${transformedCalls.length} calls`);
        return transformedCalls;
      } catch (error: any) {
        console.error("[USE_CALL_FETCH] Error fetching calls:", error);
        
        // Show user-friendly error messages
        if (error?.message?.includes("permission denied")) {
          toast.error("Access denied. Please refresh the page and try again.");
        } else if (error?.code === "PGRST301") {
          console.log("[USE_CALL_FETCH] No calls found - this is normal for new accounts");
          return [];
        } else if (error?.message?.includes("relation") && error?.message?.includes("does not exist")) {
          toast.error("Database configuration error. Please contact support.");
        } else {
          console.error("[USE_CALL_FETCH] Unexpected error:", error);
          toast.error("Failed to load calls. Please refresh the page.");
        }
        
        return [];
      }
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry permission errors or missing table errors
      if (error?.message?.includes("permission denied") || 
          error?.message?.includes("relation") ||
          error?.code === '42501') {
        return false;
      }
      return failureCount < 2;
    }
  });

  return {
    calls,
    isLoading,
    error,
    refetch
  };
};
