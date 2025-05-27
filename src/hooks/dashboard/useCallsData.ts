
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CallData } from "@/services/callService";
import { subDays } from "date-fns";
import { transformCallData } from "./callDataTransforms";

export const useCallsData = () => {
  const { company, user } = useAuth();
  const companyId = company?.id;
  
  // Fetch current period data with proper company filtering
  const { data: recentCalls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['dashboard-calls', companyId, user?.id],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId || !user?.id) {
        console.log("[DASHBOARD] Missing company ID or user ID");
        return [];
      }
      
      try {
        console.log("[DASHBOARD] Fetching calls for company:", companyId);
        
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            agents!agent_id (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', companyId)
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("[DASHBOARD] Error fetching calls:", error);
          return [];
        }
        
        if (!data) {
          console.log("[DASHBOARD] No call data returned");
          return [];
        }
        
        console.log(`[DASHBOARD] Successfully fetched ${data.length} calls`);
        return (data || []).map(transformCallData);
      } catch (error) {
        console.error("[DASHBOARD] Error in dashboard calls query:", error);
        return [];
      }
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2
  });

  // Fetch previous period data for comparison
  const { data: previousCalls } = useQuery({
    queryKey: ['dashboard-previous-calls', companyId, user?.id],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId || !user?.id) return [];
      
      try {
        console.log("[DASHBOARD] Fetching previous period calls for company:", companyId);
        
        // Get data from one week before
        const oneWeekAgo = subDays(new Date(), 7);
        const twoWeeksAgo = subDays(new Date(), 14);
        
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            agents!agent_id (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', companyId)
          .gte('timestamp', twoWeeksAgo.toISOString())
          .lte('timestamp', oneWeekAgo.toISOString())
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("[DASHBOARD] Error fetching previous calls:", error);
          return [];
        }
        
        console.log(`[DASHBOARD] Successfully fetched ${data?.length || 0} previous calls`);
        return (data || []).map(transformCallData);
      } catch (error) {
        console.error("[DASHBOARD] Error in previous dashboard calls query:", error);
        return [];
      }
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 1000 * 60 * 10 // 10 minutes for previous data
  });

  return {
    recentCalls,
    previousCalls,
    isLoading: isLoadingCalls || !companyId || !user?.id
  };
};
