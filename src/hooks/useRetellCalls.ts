import { debugLog } from "@/lib/debug";
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
      debugLog('🔍 [useRetellCalls] === STARTING CORRECTED QUERY ===');
      debugLog('🔍 [useRetellCalls] User context:', {
        userId: user?.id,
        userEmail: user?.email,
        hasUser: !!user
      });

      if (!user?.id) {
        debugLog('❌ [useRetellCalls] No user ID available');
        return [];
      }

      try {
        // STEP 1: Get user agent assignments
        debugLog('🔍 [useRetellCalls] === STEP 1: USER AGENT ASSIGNMENTS ===');
        const { data: userAgents, error: agentsError } = await supabase
          .from('user_agent_assignments')
          .select('agent_id')
          .eq('user_id', user.id);

        debugLog('🔍 [useRetellCalls] User agent assignments:', {
          data: userAgents,
          error: agentsError,
          count: userAgents?.length || 0
        });

        if (agentsError) {
          console.error('❌ [useRetellCalls] Error fetching user agents:', agentsError);
          throw agentsError;
        }

        if (!userAgents || userAgents.length === 0) {
          debugLog('⚠️ [useRetellCalls] No agents assigned to user');
          return [];
        }

        const agentIds = userAgents.map(ua => ua.agent_id);
        debugLog('🔍 [useRetellCalls] User assigned agent IDs:', agentIds);

        // STEP 2: Get retell_agents data for matching - CORREGIDO USAR retell_agent_id
        debugLog('🔍 [useRetellCalls] === STEP 2: RETELL AGENTS DATA ===');
        const { data: retellAgents, error: retellAgentsError } = await supabase
          .from('retell_agents')
          .select('id, name, description, retell_agent_id')
          .in('id', agentIds);

        debugLog('🔍 [useRetellCalls] Retell agents:', {
          data: retellAgents,
          error: retellAgentsError,
          count: retellAgents?.length || 0
        });

        if (retellAgentsError) {
          console.error('❌ [useRetellCalls] Error fetching retell agents:', retellAgentsError);
          throw retellAgentsError;
        }

        // PASO 2.5: Create a mapping of retell_agent_id to agent details - CORREGIDO
        const agentMap = new Map();
        retellAgents?.forEach(agent => {
          if (agent.retell_agent_id) { // ✅ USAR retell_agent_id NO agent_id
            agentMap.set(agent.retell_agent_id, {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              retell_agent_id: agent.retell_agent_id
            });
          }
        });

        debugLog('🔍 [useRetellCalls] Agent mapping created:', {
          mapSize: agentMap.size,
          agentKeys: Array.from(agentMap.keys())
        });

        // STEP 3: Get calls using retell_agent_id matching - CORREGIDO TABLA
        debugLog('🔍 [useRetellCalls] === STEP 3: CALLS FROM CORRECT TABLE ===');
        
        // Get the retell_agent_id values to match against calls.agent_id
        const retellAgentIds = retellAgents?.map(a => a.retell_agent_id).filter(Boolean) || [];
        debugLog('🔍 [useRetellCalls] Retell agent IDs to match:', retellAgentIds);

        if (retellAgentIds.length === 0) {
          debugLog('⚠️ [useRetellCalls] No retell agent IDs to match');
          return [];
        }

        // ✅ BUSCAR EN LA TABLA CALLS CORRECTA
        const { data: calls, error: callsError } = await supabase
          .from('calls') // ✅ TABLA CORRECTA: calls NO retell_calls
          .select(`
            id,
            call_id,
            user_id,
            agent_id,
            company_id,
            timestamp,
            start_time,
            duration_sec,
            cost_usd,
            revenue_amount,
            call_status,
            from_number,
            to_number,
            transcript,
            audio_url,
            call_summary,
            sentiment,
            disposition,
            latency_ms
          `)
          .in('agent_id', retellAgentIds) // ✅ calls.agent_id = retell_agent_id
          .order('timestamp', { ascending: false })
          .limit(100);

        debugLog('🔍 [useRetellCalls] Calls query result:', {
          data: calls,
          error: callsError,
          count: calls?.length || 0,
          matchedAgentIds: retellAgentIds
        });

        if (callsError) {
          console.error('❌ [useRetellCalls] Error fetching calls:', callsError);
          throw callsError;
        }

        // STEP 4: Transform and combine data - CORREGIDO CAMPOS
        debugLog('🔍 [useRetellCalls] === STEP 4: DATA TRANSFORMATION ===');
        
        const transformedCalls = (calls || []).map(call => {
          const agent = agentMap.get(call.agent_id);
          
          debugLog('🔍 [useRetellCalls] Transforming call:', {
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
            start_timestamp: call.timestamp || call.start_time, // ✅ USAR timestamp
            end_timestamp: call.start_time, // O calcular end_time si existe
            duration_sec: call.duration_sec || 0,
            cost_usd: call.cost_usd || 0,
            revenue_amount: call.revenue_amount || 0,
            call_status: call.call_status || 'unknown',
            from_number: call.from_number,
            to_number: call.to_number,
            transcript: call.transcript,
            recording_url: call.audio_url, // ✅ CAMPO CORRECTO
            call_summary: call.call_summary,
            sentiment: call.sentiment,
            disposition: call.disposition,
            latency_ms: call.latency_ms,
            agent: agent
          };
        });

        debugLog('🔍 [useRetellCalls] === FINAL RESULT ===');
        debugLog(`✅ [useRetellCalls] Successfully transformed ${transformedCalls.length} calls`);
        debugLog('🔍 [useRetellCalls] Sample transformed call:', transformedCalls[0]);
        
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

  debugLog('🔍 [useRetellCalls] === HOOK FINAL STATE ===', {
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