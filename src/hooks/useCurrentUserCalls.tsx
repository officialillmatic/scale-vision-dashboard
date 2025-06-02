
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
      console.log('🔍 [useCurrentUserCalls] === STARTING USER CALLS DEBUG ===');
      console.log('🔍 [useCurrentUserCalls] User context:', {
        userId: user?.id,
        userEmail: user?.email,
        hasUser: !!user
      });

      if (!user?.id) {
        console.log('❌ [useCurrentUserCalls] Missing user ID');
        return [];
      }

      try {
        // STEP 1: Get user's assigned agents
        console.log('🔍 [useCurrentUserCalls] === STEP 1: USER AGENTS ===');
        const { data: userAgents, error: agentsError } = await supabase
          .from('user_agent_assignments')
          .select('agent_id, is_primary')
          .eq('user_id', user.id);

        console.log('🔍 [useCurrentUserCalls] User agent assignments:', {
          data: userAgents,
          error: agentsError,
          count: userAgents?.length || 0
        });

        if (agentsError) {
          console.error('❌ [useCurrentUserCalls] Error fetching user agents:', agentsError);
          throw agentsError;
        }

        if (!userAgents || userAgents.length === 0) {
          console.log('⚠️ [useCurrentUserCalls] No agents assigned to user');
          return [];
        }

        const agentIds = userAgents.map(ua => ua.agent_id);
        console.log('🔍 [useCurrentUserCalls] Agent IDs to query:', agentIds);

        // STEP 2: Get calls directly by agent IDs
        console.log('🔍 [useCurrentUserCalls] === STEP 2: DIRECT CALL QUERY ===');
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
            sentiment
          `)
          .in('agent_id', agentIds)
          .order('start_timestamp', { ascending: false })
          .limit(50);

        console.log('🔍 [useCurrentUserCalls] Calls query result:', {
          data: calls,
          error: callsError,
          count: calls?.length || 0
        });

        if (callsError) {
          console.error('❌ [useCurrentUserCalls] Error fetching calls:', callsError);
          throw callsError;
        }

        // STEP 3: Get agent details
        console.log('🔍 [useCurrentUserCalls] === STEP 3: AGENT DETAILS ===');
        const { data: agentDetails, error: agentDetailsError } = await supabase
          .from('retell_agents')
          .select('id, name, description, retell_agent_id')
          .in('id', agentIds);

        console.log('🔍 [useCurrentUserCalls] Agent details:', {
          data: agentDetails,
          error: agentDetailsError,
          count: agentDetails?.length || 0
        });

        // STEP 4: Transform data
        const transformedCalls: UserCall[] = (calls || []).map(call => {
          const agentDetail = agentDetails?.find(a => a.id === call.agent_id);
          
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
            agent_details: agentDetail ? {
              id: agentDetail.id,
              name: agentDetail.name,
              description: agentDetail.description,
              retell_agent_id: agentDetail.retell_agent_id
            } : undefined
          };
        });

        console.log('🔍 [useCurrentUserCalls] === FINAL RESULT ===');
        console.log('🔍 [useCurrentUserCalls] Transformed calls:', transformedCalls.length);
        console.log('🔍 [useCurrentUserCalls] Sample call:', transformedCalls[0]);
        
        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useCurrentUserCalls] CRITICAL ERROR:', error);
        throw new Error(`Failed to fetch user calls: ${error.message}`);
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    retry: 1,
    refetchOnWindowFocus: true
  });

  console.log('🔍 [useCurrentUserCalls] === HOOK FINAL STATE ===', {
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
