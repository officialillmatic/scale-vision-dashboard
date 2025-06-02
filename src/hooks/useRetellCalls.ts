
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
      console.log('🔍 [useRetellCalls] Starting query with params:', {
        userId: user?.id,
        hasUser: !!user
      });

      if (!user?.id) {
        console.log('❌ [useRetellCalls] No user ID available');
        return [];
      }

      try {
        // First, get the user's assigned agents
        console.log('🔍 [useRetellCalls] Fetching user agent assignments...');
        const { data: userAgents, error: agentsError } = await supabase
          .from('user_agent_assignments')
          .select('agent_id')
          .eq('user_id', user.id);

        if (agentsError) {
          console.error('❌ [useRetellCalls] Error fetching user agents:', agentsError);
          throw agentsError;
        }

        console.log('🔍 [useRetellCalls] User agent assignments:', userAgents);

        if (!userAgents || userAgents.length === 0) {
          console.log('⚠️ [useRetellCalls] No agents assigned to user');
          return [];
        }

        const agentIds = userAgents.map(ua => ua.agent_id);
        console.log('🔍 [useRetellCalls] User assigned agent IDs:', agentIds);

        // Get calls from retell_calls table with proper agent joining
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
            latency_ms,
            retell_agents!retell_calls_agent_id_fkey (
              id,
              name,
              description,
              retell_agent_id
            )
          `)
          .in('agent_id', agentIds)
          .order('start_timestamp', { ascending: false })
          .limit(100);

        if (callsError) {
          console.error('❌ [useRetellCalls] Error fetching calls:', callsError);
          throw callsError;
        }

        console.log(`🔍 [useRetellCalls] Found ${calls?.length || 0} calls for user's agents`);
        console.log('🔍 [useRetellCalls] Sample call with agent data:', calls?.[0]);

        const transformedCalls = (calls || []).map(call => transformCall(call));
        console.log(`✅ [useRetellCalls] Successfully transformed ${transformedCalls.length} calls`);
        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useRetellCalls] Error in query:', error);
        throw new Error(`Failed to fetch retell calls: ${error.message}`);
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds for debugging
    retry: 2
  });

  console.log('🔍 [useRetellCalls] Hook state:', {
    retellCallsLength: retellCalls?.length || 0,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message
  });

  return {
    retellCalls,
    isLoading,
    error,
    refetch
  };
};

// Helper function to transform call data
function transformCall(call: any): RetellCall {
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
    agent: Array.isArray(call.retell_agents) && call.retell_agents.length > 0 ? {
      id: call.retell_agents[0].id,
      name: call.retell_agents[0].name,
      description: call.retell_agents[0].description,
      retell_agent_id: call.retell_agents[0].retell_agent_id
    } : call.retell_agents ? {
      id: (call.retell_agents as any).id,
      name: (call.retell_agents as any).name,
      description: (call.retell_agents as any).description,
      retell_agent_id: (call.retell_agents as any).retell_agent_id
    } : undefined
  };
}
