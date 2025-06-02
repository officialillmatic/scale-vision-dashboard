
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
  const { company, user } = useAuth();

  const { data: retellCalls = [], isLoading, error, refetch } = useQuery({
    queryKey: ['retell-calls', company?.id],
    queryFn: async (): Promise<RetellCall[]> => {
      console.log('🔍 [useRetellCalls] Starting query with params:', {
        companyId: company?.id,
        userId: user?.id,
        hasCompany: !!company,
        hasUser: !!user
      });

      if (!company?.id) {
        console.log('❌ [useRetellCalls] No company ID available');
        return [];
      }

      try {
        // First, let's check if there's any data in retell_calls at all
        console.log('🔍 [useRetellCalls] Checking total retell_calls count...');
        const { count: totalCount, error: countError } = await supabase
          .from('retell_calls')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('❌ [useRetellCalls] Error counting total retell_calls:', countError);
        } else {
          console.log('🔍 [useRetellCalls] Total retell_calls count:', totalCount);
        }

        // Check calls for specific company
        console.log('🔍 [useRetellCalls] Checking calls for company:', company.id);
        const { count: companyCount, error: companyCountError } = await supabase
          .from('retell_calls')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        if (companyCountError) {
          console.error('❌ [useRetellCalls] Error counting company retell_calls:', companyCountError);
        } else {
          console.log('🔍 [useRetellCalls] Company retell_calls count:', companyCount);
        }

        // Now fetch the actual data
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
          console.error('❌ [useRetellCalls] Error details:', {
            message: callsError.message,
            details: callsError.details,
            hint: callsError.hint,
            code: callsError.code
          });
          throw callsError;
        }

        console.log('🔍 [useRetellCalls] Raw query result:', {
          callsLength: calls?.length || 0,
          firstCall: calls?.[0] || null,
          sampleData: calls?.slice(0, 3) || []
        });

        // Log the date range of calls we found
        if (calls && calls.length > 0) {
          const timestamps = calls.map(call => call.start_timestamp).filter(Boolean);
          const sortedTimestamps = timestamps.sort();
          console.log('🔍 [useRetellCalls] Date range of calls:', {
            earliest: sortedTimestamps[0],
            latest: sortedTimestamps[sortedTimestamps.length - 1],
            count: timestamps.length
          });
        }

        // Transform the data
        const transformedCalls: RetellCall[] = (calls || []).map(call => {
          const transformed = {
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
          };

          console.log('🔍 [useRetellCalls] Transformed call sample:', {
            id: transformed.id,
            call_id: transformed.call_id,
            start_timestamp: transformed.start_timestamp,
            call_status: transformed.call_status,
            cost_usd: transformed.cost_usd,
            agent: transformed.agent
          });

          return transformed;
        });

        console.log(`✅ [useRetellCalls] Successfully transformed ${transformedCalls.length} calls`);
        return transformedCalls;
      } catch (error: any) {
        console.error('❌ [useRetellCalls] Error in query:', error);
        console.error('❌ [useRetellCalls] Error stack:', error.stack);
        throw new Error(`Failed to fetch retell calls: ${error.message}`);
      }
    },
    enabled: !!company?.id,
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
