
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RetellCall {
  id: string;
  call_id: string;
  user_id?: string;
  agent_id?: string;
  company_id?: string;
  start_timestamp: string;
  end_timestamp?: string;
  duration_sec: number;
  cost_usd: number;
  revenue_amount: number;
  call_status: string;
  from_number?: string;
  to_number?: string;
  transcript?: string;
  recording_url?: string;
  call_summary?: string;
  sentiment?: string;
  disposition?: string;
  latency_ms?: number;
  agent?: {
    id: string;
    name: string;
    description?: string;
    retell_agent_id?: string;
  };
}

export const useRetellCalls = () => {
  const { user } = useAuth();

  const { data: retellCalls = [], isLoading, error, refetch } = useQuery({
    queryKey: ['retell-calls', user?.id],
    queryFn: async (): Promise<RetellCall[]> => {
      console.log('🔍 [useRetellCalls] === STARTING COMPREHENSIVE DEBUG ===');
      console.log('🔍 [useRetellCalls] User context:', {
        userId: user?.id,
        userEmail: user?.email,
        hasUser: !!user
      });

      if (!user?.id) {
        console.log('❌ [useRetellCalls] No user ID available');
        return [];
      }

      try {
        // STEP 1: Debug user agent assignments
        console.log('🔍 [useRetellCalls] === STEP 1: USER AGENT ASSIGNMENTS ===');
        const { data: userAgents, error: agentsError } = await supabase
          .from('user_agent_assignments')
          .select('*')
          .eq('user_id', user.id);

        console.log('🔍 [useRetellCalls] Raw user_agent_assignments query result:', {
          data: userAgents,
          error: agentsError,
          count: userAgents?.length || 0
        });

        if (agentsError) {
          console.error('❌ [useRetellCalls] Error fetching user agents:', agentsError);
          throw agentsError;
        }

        if (!userAgents || userAgents.length === 0) {
          console.log('⚠️ [useRetellCalls] No agents assigned to user - checking all assignments in table');
          
          // Debug: Check what assignments exist in the table
          const { data: allAssignments } = await supabase
            .from('user_agent_assignments')
            .select('*')
            .limit(10);
          
          console.log('🔍 [useRetellCalls] Sample assignments in table:', allAssignments);
          return [];
        }

        const agentIds = userAgents.map(ua => ua.agent_id);
        console.log('🔍 [useRetellCalls] User assigned agent IDs:', agentIds);

        // STEP 2: Debug retell_calls table
        console.log('🔍 [useRetellCalls] === STEP 2: RETELL_CALLS TABLE ===');
        
        // First, check what's in retell_calls table
        const { data: allCalls, error: allCallsError } = await supabase
          .from('retell_calls')
          .select('id, call_id, agent_id, user_id, call_status, start_timestamp')
          .order('start_timestamp', { ascending: false })
          .limit(10);

        console.log('🔍 [useRetellCalls] Sample calls in retell_calls table:', {
          data: allCalls,
          error: allCallsError,
          count: allCalls?.length || 0
        });

        // STEP 3: Simple direct query - calls for user's agents
        console.log('🔍 [useRetellCalls] === STEP 3: DIRECT AGENT FILTERING ===');
        
        const { data: userAgentCalls, error: userCallsError } = await supabase
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
            disposition,
            latency_ms
          `)
          .in('agent_id', agentIds)
          .order('start_timestamp', { ascending: false })
          .limit(100);

        console.log('🔍 [useRetellCalls] Direct agent filtering result:', {
          data: userAgentCalls,
          error: userCallsError,
          count: userAgentCalls?.length || 0,
          queriedAgentIds: agentIds
        });

        if (userCallsError) {
          console.error('❌ [useRetellCalls] Error fetching calls by agent:', userCallsError);
          throw userCallsError;
        }

        // STEP 4: Get agent details separately
        console.log('🔍 [useRetellCalls] === STEP 4: AGENT DETAILS ===');
        
        const { data: agentDetails, error: agentDetailsError } = await supabase
          .from('retell_agents')
          .select('id, name, description, retell_agent_id')
          .in('id', agentIds);

        console.log('🔍 [useRetellCalls] Agent details:', {
          data: agentDetails,
          error: agentDetailsError,
          count: agentDetails?.length || 0
        });

        if (agentDetailsError) {
          console.error('❌ [useRetellCalls] Error fetching agent details:', agentDetailsError);
        }

        // STEP 5: Transform and combine data
        console.log('🔍 [useRetellCalls] === STEP 5: DATA TRANSFORMATION ===');
        
        const transformedCalls = (userAgentCalls || []).map(call => {
          const agent = agentDetails?.find(a => a.id === call.agent_id);
          
          console.log('🔍 [useRetellCalls] Transforming call:', {
            callId: call.call_id,
            agentId: call.agent_id,
            foundAgent: !!agent,
            agentName: agent?.name
          });

          return {
            id: call.id,
            call_id: call.call_id,
            user_id: call.user_id,
            agent_id: call.agent_id,
            company_id: call.company_id,
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
            disposition: call.disposition,
            latency_ms: call.latency_ms,
            agent: agent ? {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              retell_agent_id: agent.retell_agent_id
            } : undefined
          };
        });

        console.log('🔍 [useRetellCalls] === FINAL RESULT ===');
        console.log(`✅ [useRetellCalls] Successfully transformed ${transformedCalls.length} calls`);
        console.log('🔍 [useRetellCalls] Sample transformed call:', transformedCalls[0]);
        
        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useRetellCalls] CRITICAL ERROR:', error);
        console.error('❌ [useRetellCalls] Error stack:', error.stack);
        throw new Error(`Failed to fetch retell calls: ${error.message}`);
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    retry: 1,
    refetchOnWindowFocus: true
  });

  console.log('🔍 [useRetellCalls] === HOOK FINAL STATE ===', {
    retellCallsLength: retellCalls?.length || 0,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message,
    sampleCall: retellCalls?.[0]
  });

  return {
    retellCalls,
    isLoading,
    error,
    refetch
  };
};
