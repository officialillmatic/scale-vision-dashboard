
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
      console.log('🔍 [useRetellCalls] === STARTING QUERY WITH CORRECTED LOGIC ===');
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
        // STEP 1: Get user agent assignments
        console.log('🔍 [useRetellCalls] === STEP 1: USER AGENT ASSIGNMENTS ===');
        const { data: userAgents, error: agentsError } = await supabase
          .from('user_agent_assignments')
          .select('agent_id')
          .eq('user_id', user.id);

        console.log('🔍 [useRetellCalls] User agent assignments:', {
          data: userAgents,
          error: agentsError,
          count: userAgents?.length || 0
        });

        if (agentsError) {
          console.error('❌ [useRetellCalls] Error fetching user agents:', agentsError);
          throw agentsError;
        }

        if (!userAgents || userAgents.length === 0) {
          console.log('⚠️ [useRetellCalls] No agents assigned to user');
          return [];
        }

        const agentIds = userAgents.map(ua => ua.agent_id);
        console.log('🔍 [useRetellCalls] User assigned agent IDs:', agentIds);

        // STEP 2: Get retell_agents data for matching
        console.log('🔍 [useRetellCalls] === STEP 2: RETELL AGENTS DATA ===');
        const { data: retellAgents, error: retellAgentsError } = await supabase
          .from('retell_agents')
          .select('agent_id, id, name, description, retell_agent_id')
          .in('id', agentIds);

        console.log('🔍 [useRetellCalls] Retell agents:', {
          data: retellAgents,
          error: retellAgentsError,
          count: retellAgents?.length || 0
        });

        if (retellAgentsError) {
          console.error('❌ [useRetellCalls] Error fetching retell agents:', retellAgentsError);
        }

        // Create a mapping of retell_agent.agent_id to agent details
        const agentMap = new Map();
        retellAgents?.forEach(agent => {
          if (agent.agent_id) {
            agentMap.set(agent.agent_id, {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              retell_agent_id: agent.retell_agent_id
            });
          }
        });

        console.log('🔍 [useRetellCalls] Agent mapping created:', {
          mapSize: agentMap.size,
          agentKeys: Array.from(agentMap.keys())
        });

        // STEP 3: Get retell_calls using agent_id string matching
        console.log('🔍 [useRetellCalls] === STEP 3: RETELL CALLS ===');
        
        // Get the agent_id values from retell_agents to match against retell_calls
        const retellAgentIds = retellAgents?.map(a => a.agent_id).filter(Boolean) || [];
        console.log('🔍 [useRetellCalls] Retell agent IDs to match:', retellAgentIds);

        if (retellAgentIds.length === 0) {
          console.log('⚠️ [useRetellCalls] No retell agent IDs to match');
          return [];
        }

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
            disposition,
            latency_ms
          `)
          .in('agent_id', retellAgentIds)
          .order('start_timestamp', { ascending: false })
          .limit(100);

        console.log('🔍 [useRetellCalls] Retell calls query result:', {
          data: calls,
          error: callsError,
          count: calls?.length || 0,
          matchedAgentIds: retellAgentIds
        });

        if (callsError) {
          console.error('❌ [useRetellCalls] Error fetching calls:', callsError);
          throw callsError;
        }

        // STEP 4: Transform and combine data using string comparison
        console.log('🔍 [useRetellCalls] === STEP 4: DATA TRANSFORMATION ===');
        
        const transformedCalls = (calls || []).map(call => {
          // Use string comparison to match agent_id
          const agent = agentMap.get(call.agent_id);
          
          console.log('🔍 [useRetellCalls] Transforming call:', {
            callId: call.call_id,
            callAgentId: call.agent_id,
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
            agent: agent
          };
        });

        console.log('🔍 [useRetellCalls] === FINAL RESULT ===');
        console.log(`✅ [useRetellCalls] Successfully transformed ${transformedCalls.length} calls`);
        console.log('🔍 [useRetellCalls] Sample transformed call:', transformedCalls[0]);
        
        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useRetellCalls] CRITICAL ERROR:', error);
        throw new Error(`Failed to fetch retell calls: ${error.message}`);
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
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
