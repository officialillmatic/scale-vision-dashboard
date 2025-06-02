
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RetellCallData {
  id: string;
  call_id: string;
  retell_agent_id?: string;
  agent_id?: string;
  user_id?: string;
  company_id?: string;
  start_timestamp: Date;
  end_timestamp?: Date;
  duration_sec: number;
  call_status: string;
  disconnection_reason?: string;
  disposition?: string;
  from_number?: string;
  to_number?: string;
  cost_usd: number;
  revenue_amount: number;
  billing_duration_sec: number;
  rate_per_minute: number;
  recording_url?: string;
  transcript?: string;
  transcript_url?: string;
  sentiment?: string;
  sentiment_score?: number;
  result_sentiment?: any;
  latency_ms?: number;
  call_summary?: string;
  created_at: Date;
  updated_at: Date;
  agent?: {
    id: string;
    name: string;
    rate_per_minute: number;
  };
}

export interface RetellCallMetrics {
  total_calls: number;
  total_duration_min: number;
  avg_duration_sec: number;
  total_cost: number;
  total_revenue: number;
  success_rate: number;
}

export interface RetellDailyStats {
  date: string;
  call_count: number;
  total_duration_min: number;
  total_revenue: number;
}

export interface RetellCallOutcome {
  status_type: string;
  count: number;
}

export function useRetellCallData(
  startDate?: Date,
  endDate?: Date
) {
  const { company } = useAuth();

  const { data: retellCalls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['retell-calls', company?.id, startDate, endDate],
    queryFn: async (): Promise<RetellCallData[]> => {
      if (!company?.id) return [];

      try {
        let query = supabase
          .from('retell_calls')
          .select(`
            *,
            agent:agents!retell_calls_agent_id_fkey (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', company.id)
          .order('start_timestamp', { ascending: false });

        if (startDate) {
          query = query.gte('start_timestamp', startDate.toISOString());
        }
        if (endDate) {
          query = query.lte('start_timestamp', endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching retell calls:', error);
          return [];
        }

        return (data || []).map(call => ({
          ...call,
          start_timestamp: new Date(call.start_timestamp),
          end_timestamp: call.end_timestamp ? new Date(call.end_timestamp) : undefined,
          created_at: new Date(call.created_at),
          updated_at: new Date(call.updated_at),
        }));
      } catch (error) {
        console.error('Error in retell calls query:', error);
        return [];
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const { data: retellMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['retell-metrics', company?.id, startDate, endDate],
    queryFn: async (): Promise<RetellCallMetrics | null> => {
      if (!company?.id) return null;

      try {
        const { data, error } = await supabase.rpc('get_retell_call_metrics', {
          p_company_id: company.id,
          p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_end_date: endDate?.toISOString() || new Date().toISOString()
        });

        if (error) {
          console.error('Error fetching retell metrics:', error);
          return null;
        }

        return data?.[0] || null;
      } catch (error) {
        console.error('Error in retell metrics query:', error);
        return null;
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: retellDailyStats, isLoading: isLoadingDaily } = useQuery({
    queryKey: ['retell-daily-stats', company?.id, startDate, endDate],
    queryFn: async (): Promise<RetellDailyStats[]> => {
      if (!company?.id) return [];

      try {
        const { data, error } = await supabase.rpc('get_retell_daily_calls', {
          p_company_id: company.id,
          p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_end_date: endDate?.toISOString() || new Date().toISOString()
        });

        if (error) {
          console.error('Error fetching retell daily stats:', error);
          return [];
        }

        return (data || []).map(stat => ({
          ...stat,
          date: stat.date
        }));
      } catch (error) {
        console.error('Error in retell daily stats query:', error);
        return [];
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: retellOutcomes, isLoading: isLoadingOutcomes } = useQuery({
    queryKey: ['retell-outcomes', company?.id, startDate, endDate],
    queryFn: async (): Promise<RetellCallOutcome[]> => {
      if (!company?.id) return [];

      try {
        const { data, error } = await supabase.rpc('get_retell_call_outcomes', {
          p_company_id: company.id,
          p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_end_date: endDate?.toISOString() || new Date().toISOString()
        });

        if (error) {
          console.error('Error fetching retell outcomes:', error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('Error in retell outcomes query:', error);
        return [];
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    retellCalls,
    retellMetrics,
    retellDailyStats,
    retellOutcomes,
    isLoading: isLoadingCalls || isLoadingMetrics || isLoadingDaily || isLoadingOutcomes,
  };
}
