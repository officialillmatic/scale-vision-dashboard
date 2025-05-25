
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CallData } from "@/services/callService";
import { subDays, format } from "date-fns";

interface DashboardMetrics {
  totalCalls: number;
  totalMinutes: number;
  totalCost: string;
  avgDuration: string;
  percentChange: {
    calls: string;
    minutes: string;
    duration: string;
    cost: string;
  };
  dailyCallCounts: Array<{
    date: string;
    calls: number;
    minutes: number;
  }>;
  callOutcomes: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export const useDashboardMetrics = () => {
  const { company, user } = useAuth();
  
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics', company?.id, user?.id],
    queryFn: async (): Promise<DashboardMetrics | null> => {
      if (!company?.id || !user?.id) {
        console.log("[DASHBOARD-METRICS] Missing company ID or user ID");
        return null;
      }

      try {
        console.log("[DASHBOARD-METRICS] Fetching metrics for company:", company.id);
        
        // Define time periods
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);
        const sixtyDaysAgo = subDays(now, 60);

        // Get current period metrics
        const { data: currentMetrics, error: currentError } = await supabase
          .rpc('get_call_metrics_for_period', {
            company_id_param: company.id,
            start_date_param: thirtyDaysAgo.toISOString(),
            end_date_param: now.toISOString()
          });

        if (currentError) {
          console.error("[DASHBOARD-METRICS] Error fetching current metrics:", currentError);
          throw currentError;
        }

        // Get previous period metrics for comparison
        const { data: previousMetrics, error: previousError } = await supabase
          .rpc('get_call_metrics_for_period', {
            company_id_param: company.id,
            start_date_param: sixtyDaysAgo.toISOString(),
            end_date_param: thirtyDaysAgo.toISOString()
          });

        if (previousError) {
          console.error("[DASHBOARD-METRICS] Error fetching previous metrics:", previousError);
        }

        // Get daily distribution
        const { data: dailyData, error: dailyError } = await supabase
          .rpc('get_daily_call_distribution', {
            company_id_param: company.id,
            start_date_param: thirtyDaysAgo.toISOString(),
            end_date_param: now.toISOString()
          });

        if (dailyError) {
          console.error("[DASHBOARD-METRICS] Error fetching daily data:", dailyError);
        }

        // Get call outcomes
        const { data: outcomes, error: outcomesError } = await supabase
          .rpc('get_call_outcomes', {
            company_id_param: company.id
          });

        if (outcomesError) {
          console.error("[DASHBOARD-METRICS] Error fetching outcomes:", outcomesError);
        }

        // Process current metrics
        const current = currentMetrics?.[0] || {
          total_calls: 0,
          total_duration_min: 0,
          avg_duration_sec: 0,
          total_cost: 0
        };

        const previous = previousMetrics?.[0] || {
          total_calls: 0,
          total_duration_min: 0,
          avg_duration_sec: 0,
          total_cost: 0
        };

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): string => {
          if (previous === 0) return current > 0 ? "+100%" : "0%";
          const change = ((current - previous) / previous) * 100;
          return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
        };

        // Format duration
        const formatDuration = (seconds: number): string => {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = Math.floor(seconds % 60);
          return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        };

        // Process daily data
        const dailyCallCounts = (dailyData || []).map(day => ({
          date: format(new Date(day.date), 'MMM dd'),
          calls: Number(day.call_count),
          minutes: Number(day.total_duration_min)
        }));

        // Process call outcomes
        const outcomeColors = {
          completed: '#22c55e',
          'no-answer': '#ef4444',
          voicemail: '#f59e0b',
          hangup: '#6b7280'
        };

        const callOutcomes = (outcomes || []).map(outcome => ({
          name: outcome.status_type,
          value: Number(outcome.count),
          color: outcomeColors[outcome.status_type as keyof typeof outcomeColors] || '#6b7280'
        }));

        const result: DashboardMetrics = {
          totalCalls: Number(current.total_calls),
          totalMinutes: Math.round(Number(current.total_duration_min)),
          totalCost: `$${Number(current.total_cost).toFixed(2)}`,
          avgDuration: formatDuration(Number(current.avg_duration_sec)),
          percentChange: {
            calls: calculateChange(Number(current.total_calls), Number(previous.total_calls)),
            minutes: calculateChange(Number(current.total_duration_min), Number(previous.total_duration_min)),
            duration: calculateChange(Number(current.avg_duration_sec), Number(previous.avg_duration_sec)),
            cost: calculateChange(Number(current.total_cost), Number(previous.total_cost))
          },
          dailyCallCounts,
          callOutcomes
        };

        console.log("[DASHBOARD-METRICS] Successfully calculated metrics:", result);
        return result;

      } catch (error) {
        console.error("[DASHBOARD-METRICS] Error in metrics calculation:", error);
        throw error;
      }
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    meta: {
      onError: (error: any) => {
        console.error("[DASHBOARD-METRICS] Query error:", error);
      }
    }
  });

  return {
    metrics,
    isLoading,
    error
  };
};
