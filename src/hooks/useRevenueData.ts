
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RevenueMetrics {
  total_revenue: number;
  total_calls: number;
  avg_revenue_per_call: number;
  top_performing_agent: string;
  revenue_by_day: Array<{
    date: string;
    revenue: number;
    calls: number;
  }>;
}

export interface RevenueTransaction {
  id: string;
  call_id: string;
  user_id: string;
  company_id: string;
  agent_id?: string;
  transaction_date: string;
  revenue_amount: number;
  billing_duration_sec: number;
  rate_per_minute: number;
  transaction_type: string;
  status: string;
  invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export function useRevenueData(
  startDate?: Date,
  endDate?: Date
) {
  const { company } = useAuth();

  const { data: revenueMetrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['revenue-metrics', company?.id, startDate, endDate],
    queryFn: async (): Promise<RevenueMetrics | null> => {
      if (!company?.id) return null;

      try {
        const { data, error } = await supabase.rpc('get_revenue_metrics', {
          p_company_id: company.id,
          p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_end_date: endDate?.toISOString() || new Date().toISOString()
        });

        if (error) {
          console.error('Error fetching revenue metrics:', error);
          return null;
        }

        return data?.[0] || null;
      } catch (error) {
        console.error('Error in revenue metrics query:', error);
        return null;
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: revenueTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['revenue-transactions', company?.id, startDate, endDate],
    queryFn: async (): Promise<RevenueTransaction[]> => {
      if (!company?.id) return [];

      try {
        let query = supabase
          .from('revenue_transactions')
          .select('*')
          .eq('company_id', company.id)
          .eq('status', 'completed')
          .order('transaction_date', { ascending: false });

        if (startDate) {
          query = query.gte('transaction_date', startDate.toISOString());
        }
        if (endDate) {
          query = query.lte('transaction_date', endDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching revenue transactions:', error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('Error in revenue transactions query:', error);
        return [];
      }
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    revenueMetrics,
    revenueTransactions,
    isLoading: isLoadingMetrics || isLoadingTransactions,
  };
}
