
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
    queryKey: ['dashboard-metrics-optimized', company?.id, user?.id],
    queryFn: async (): Promise<DashboardMetrics | null> => {
      if (!company?.id || !user?.id) {
        console.log("[DASHBOARD-METRICS] Missing company ID or user ID");
        return null;
      }

      try {
        console.log("[DASHBOARD-METRICS] Fetching optimized metrics for company:", company.id);
        
        // Define time periods
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 30);

        // Use optimized function to get all metrics in one call
        const { data: metricsData, error: metricsError } = await supabase
          .rpc('get_dashboard_metrics_optimized', {
            p_company_id: company.id,
            p_start_date: thirtyDaysAgo.toISOString(),
            p_end_date: now.toISOString()
          });

        if (metricsError) {
          console.error("[DASHBOARD-METRICS] Error fetching optimized metrics:", metricsError);
          throw metricsError;
        }

        if (!metricsData || metricsData.length === 0) {
          console.log("[DASHBOARD-METRICS] No metrics data returned");
          return null;
        }

        const data = metricsData[0];

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
        const dailyCallCounts = (data.daily_data || []).map((day: any) => ({
          date: format(new Date(day.date), 'MMM dd'),
          calls: Number(day.calls),
          minutes: Number(day.minutes)
        }));

        // Process call outcomes
        const outcomeColors = {
          completed: '#22c55e',
          'no-answer': '#ef4444',
          voicemail: '#f59e0b',
          hangup: '#6b7280'
        };

        const callOutcomes = (data.outcomes_data || []).map((outcome: any) => ({
          name: outcome.name,
          value: Number(outcome.value),
          color: outcomeColors[outcome.name as keyof typeof outcomeColors] || '#6b7280'
        }));

        const result: DashboardMetrics = {
          totalCalls: Number(data.current_calls),
          totalMinutes: Math.round(Number(data.current_duration_min)),
          totalCost: `$${Number(data.current_cost).toFixed(2)}`,
          avgDuration: formatDuration(Number(data.current_avg_duration)),
          percentChange: {
            calls: calculateChange(Number(data.current_calls), Number(data.previous_calls)),
            minutes: calculateChange(Number(data.current_duration_min), Number(data.previous_duration_min)),
            duration: calculateChange(Number(data.current_avg_duration), Number(data.previous_avg_duration)),
            cost: calculateChange(Number(data.current_cost), Number(data.previous_cost))
          },
          dailyCallCounts,
          callOutcomes
        };

        console.log("[DASHBOARD-METRICS] Successfully calculated optimized metrics:", result);
        return result;

      } catch (error) {
        console.error("[DASHBOARD-METRICS] Error in optimized metrics calculation:", error);
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
