
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CallData } from "@/services/callService";
import { subDays } from "date-fns";
import { transformCallData } from "./callDataTransforms";

export const useCallsData = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  
  // Fetch current period data
  const { data: recentCalls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['dashboard-calls', companyId],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId) return [];
      
      try {
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
          .eq('company_id', companyId)
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("Error fetching dashboard calls:", error);
          return [];
        }
        
        return (data || []).map(transformCallData);
      } catch (error) {
        console.error("Error in dashboard calls query:", error);
        return [];
      }
    },
    enabled: !!companyId
  });

  // Fetch previous period data for comparison
  const { data: previousCalls } = useQuery({
    queryKey: ['dashboard-previous-calls', companyId],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId) return [];
      
      try {
        // Get data from one week before
        const oneWeekAgo = subDays(new Date(), 7);
        const twoWeeksAgo = subDays(new Date(), 14);
        
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
          .eq('company_id', companyId)
          .gte('timestamp', twoWeeksAgo.toISOString())
          .lte('timestamp', oneWeekAgo.toISOString())
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("Error fetching previous dashboard calls:", error);
          return [];
        }
        
        return (data || []).map(transformCallData);
      } catch (error) {
        console.error("Error in previous dashboard calls query:", error);
        return [];
      }
    },
    enabled: !!companyId
  });

  return {
    recentCalls,
    previousCalls,
    isLoading: isLoadingCalls || !companyId
  };
};
