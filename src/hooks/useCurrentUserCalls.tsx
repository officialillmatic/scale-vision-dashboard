
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserCall {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  start_timestamp: string;
  end_timestamp?: string;
  duration_sec: number;
  cost_usd: number;
  revenue_amount: number;
  call_status: string;
  from_number?: string;
  to_number?: string;
  agent_details?: {
    id: string;
    name: string;
    description?: string;
    retell_agent_id?: string;
  };
  transcript?: string;
  recording_url?: string;
  call_summary?: string;
  sentiment?: string;
}

export const useCurrentUserCalls = () => {
  const { user } = useAuth();

  const { data: userCalls = [], isLoading, error, refetch } = useQuery({
    queryKey: ['current-user-calls', user?.id],
    queryFn: async (): Promise<UserCall[]> => {
      console.log('🔍 [useCurrentUserCalls] Starting query with params:', {
        userId: user?.id,
        hasUser: !!user
      });

      if (!user?.id) {
        console.log('❌ [useCurrentUserCalls] Missing user ID');
        return [];
      }

      try {
        console.log('🔍 [useCurrentUserCalls] Fetching user agent assignments...');
        
        // Get user's assigned agents first
        const { data: userAgents, error: agentsError } = await supabase
          .from('user_agent_assignments')
          .select('agent_id')
          .eq('user_id', user.id);

        if (agentsError) {
          console.error('❌ [useCurrentUserCalls] Error fetching user agents:', agentsError);
          throw agentsError;
        }

        console.log('🔍 [useCurrentUserCalls] User agent assignments:', userAgents);

        if (!userAgents || userAgents.length === 0) {
          console.log('⚠️ [useCurrentUserCalls] No agents assigned to user');
          return [];
        }

        const agentIds = userAgents.map(ua => ua.agent_id);
        console.log('🔍 [useCurrentUserCalls] User assigned agent IDs:', agentIds);

        // Get calls from retell_calls table with proper agent joining using the corrected foreign key
        const { data: calls, error: callsError } = await supabase
          .from('retell_calls')
          .select(`
            id,
            call_id,
            user_id,
            agent_id,
            company_id,
            start_timestamp,
            end_timestamp,
            duration_sec,
            cost_usd,
            revenue_amount,
            call_status,
            from_number,
            to_number,
            transcript,
            recording_url,
            call_summary,
            sentiment,
            retell_agents!retell_calls_agent_id_fkey (
              id,
              name,
              description,
              retell_agent_id
            )
          `)
          .in('agent_id', agentIds)
          .order('start_timestamp', { ascending: false })
          .limit(50);

        if (callsError) {
          console.error('❌ [useCurrentUserCalls] Error fetching calls:', callsError);
          throw callsError;
        }

        console.log(`🔍 [useCurrentUserCalls] Found ${calls?.length || 0} calls for user's agents`);

        // Transform the data to match our interface
        const transformedCalls: UserCall[] = (calls || []).map(call => {
          // Handle the agent data properly - it could be an array or single object
          const agentData = Array.isArray(call.retell_agents) 
            ? call.retell_agents[0] 
            : call.retell_agents;

          return {
            id: call.id,
            call_id: call.call_id,
            user_id: call.user_id || user.id,
            agent_id: call.agent_id || '',
            company_id: call.company_id || '',
            start_timestamp: call.start_timestamp,
            end_timestamp: call.end_timestamp,
            duration_sec: call.duration_sec || 0,
            cost_usd: call.cost_usd || 0,
            revenue_amount: call.revenue_amount || 0,
            call_status: call.call_status || 'unknown',
            from_number: call.from_number,
            to_number: call.to_number,
            transcript: call.transcript,
            recording_url: call.recording_url,
            call_summary: call.call_summary,
            sentiment: call.sentiment,
            agent_details: agentData ? {
              id: agentData.id,
              name: agentData.name,
              description: agentData.description,
              retell_agent_id: agentData.retell_agent_id
            } : undefined
          };
        });

        console.log('🔍 [useCurrentUserCalls] Transformed calls:', transformedCalls.length);
        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useCurrentUserCalls] Error in query:', error);
        throw new Error(`Failed to fetch user calls: ${error.message}`);
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds for debugging
    retry: 2
  });

  console.log('🔍 [useCurrentUserCalls] Hook state:', {
    userCallsLength: userCalls?.length || 0,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message
  });

  return {
    userCalls,
    isLoading,
    error,
    refetch
  };
};
