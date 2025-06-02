
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
  const { company } = useAuth();

  const { data: retellCalls = [], isLoading, error, refetch } = useQuery({
    queryKey: ['retell-calls', company?.id],
    queryFn: async (): Promise<RetellCall[]> => {
      if (!company?.id) {
        console.log('🔍 [useRetellCalls] No company ID available');
        return [];
      }

      try {
        console.log('🔍 [useRetellCalls] Fetching retell calls for company:', company.id);

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
            agents!retell_calls_agent_id_fkey (
              id,
              name,
              description,
              retell_agent_id
            )
          `)
          .eq('company_id', company.id)
          .order('start_timestamp', { ascending: false })
          .limit(100);

        if (callsError) {
          console.error('❌ [useRetellCalls] Error fetching calls:', callsError);
          throw callsError;
        }

        console.log(`🔍 [useRetellCalls] Found ${calls?.length || 0} retell calls`);

        // Transform the data
        const transformedCalls: RetellCall[] = (calls || []).map(call => ({
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
          agent: Array.isArray(call.agents) && call.agents.length > 0 ? {
            id: call.agents[0].id,
            name: call.agents[0].name,
            description: call.agents[0].description,
            retell_agent_id: call.agents[0].retell_agent_id
          } : call.agents ? {
            id: (call.agents as any).id,
            name: (call.agents as any).name,
            description: (call.agents as any).description,
            retell_agent_id: (call.agents as any).retell_agent_id
          } : undefined
        }));

        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useRetellCalls] Error in query:', error);
        throw new Error(`Failed to fetch retell calls: ${error.message}`);
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2
  });

  return {
    retellCalls,
    isLoading,
    error,
    refetch
  };
};
