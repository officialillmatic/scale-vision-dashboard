
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";

export interface DashboardMetrics {
  totalCalls: number;
  totalMinutes: number;
  avgDuration: string;
  totalCost: string;
  percentChange: {
    calls: string;
    minutes: string;
    duration: string;
    cost: string;
  };
  dailyCallCounts: {
    date: string;
    calls: number;
    minutes: number;
  }[];
  callOutcomes: {
    name: string;
    value: number;
    color: string;
  }[];
}

export function useDashboardMetrics() {
  const { company, user } = useAuth();
  
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics", company?.id, user?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!company?.id || !user?.id) {
        console.log("[DASHBOARD_METRICS] Missing company or user ID");
        throw new Error("Company ID and User ID are required");
      }
      
      try {
        console.log("[DASHBOARD_METRICS] Fetching metrics for company:", company.id);
        
        // Get current period metrics (last 7 days)
        const currentEnd = new Date();
        const currentStart = subDays(currentEnd, 7);
        
        // Get previous period metrics (7 days before current period)
        const previousEnd = subDays(currentStart, 1);
        const previousStart = subDays(previousEnd, 7);
        
        // Fetch current period data with company filtering
        const { data: currentData, error: currentError } = await supabase.rpc(
          'get_call_metrics_for_period',
          { 
            company_id_param: company.id,
            start_date_param: currentStart.toISOString(),
            end_date_param: currentEnd.toISOString()
          }
        );
        
        if (currentError) {
          console.error("[DASHBOARD_METRICS] Current period error:", currentError);
          throw currentError;
        }
        
        // Fetch previous period data with company filtering
        const { data: previousData, error: previousError } = await supabase.rpc(
          'get_call_metrics_for_period',
          { 
            company_id_param: company.id,
            start_date_param: previousStart.toISOString(),
            end_date_param: previousEnd.toISOString()
          }
        );
        
        if (previousError) {
          console.error("[DASHBOARD_METRICS] Previous period error:", previousError);
          throw previousError;
        }
        
        // Get daily call distribution with company filtering
        const { data: dailyData, error: dailyError } = await supabase.rpc(
          'get_daily_call_distribution',
          { 
            company_id_param: company.id,
            start_date_param: currentStart.toISOString(),
            end_date_param: currentEnd.toISOString()
          }
        );
        
        if (dailyError) {
          console.error("[DASHBOARD_METRICS] Daily data error:", dailyError);
          throw dailyError;
        }
        
        // Get call outcomes with company filtering
        const { data: outcomesData, error: outcomesError } = await supabase.rpc(
          'get_call_outcomes',
          { company_id_param: company.id }
        );
        
        if (outcomesError) {
          console.error("[DASHBOARD_METRICS] Outcomes error:", outcomesError);
          throw outcomesError;
        }
        
        // Calculate percent changes
        const calculatePercentChange = (current: number, previous: number): string => {
          if (previous === 0) return current > 0 ? "+100%" : "0%";
          
          const change = ((current - previous) / previous) * 100;
          return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
        };
        
        // Map daily data to required format
        const dailyCallCounts = dailyData.map((day: any) => ({
          date: format(new Date(day.date), 'EEE'),
          calls: day.call_count,
          minutes: Math.round(day.total_duration_min)
        }));
        
        // Map outcomes data with colors
        const outcomeColors: Record<string, string> = {
          'completed': "#10B981",
          'voicemail': "#6366F1",
          'no-answer': "#EF4444",
          'hangup': "#F59E0B"
        };
        
        const callOutcomes = outcomesData.map((outcome: any) => ({
          name: outcome.status_type,
          value: outcome.count,
          color: outcomeColors[outcome.status_type] || "#9CA3AF"
        }));
        
        // Format metrics
        const formatDuration = (seconds: number): string => {
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = Math.round(seconds % 60);
          return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        };
        
        const result = {
          totalCalls: currentData.total_calls || 0,
          totalMinutes: Math.round(currentData.total_duration_min || 0),
          avgDuration: formatDuration((currentData.avg_duration_sec || 0)),
          totalCost: `$${(currentData.total_cost || 0).toFixed(2)}`,
          percentChange: {
            calls: calculatePercentChange(
              currentData.total_calls || 0, 
              previousData.total_calls || 0
            ),
            minutes: calculatePercentChange(
              currentData.total_duration_min || 0, 
              previousData.total_duration_min || 0
            ),
            duration: calculatePercentChange(
              currentData.avg_duration_sec || 0, 
              previousData.avg_duration_sec || 0
            ),
            cost: calculatePercentChange(
              currentData.total_cost || 0, 
              previousData.total_cost || 0
            )
          },
          dailyCallCounts,
          callOutcomes
        };
        
        console.log("[DASHBOARD_METRICS] Successfully fetched metrics:", {
          totalCalls: result.totalCalls,
          totalCost: result.totalCost,
          dailyCallsCount: dailyCallCounts.length
        });
        
        return result;
      } catch (error) {
        console.error("[DASHBOARD_METRICS] Error fetching dashboard metrics:", error);
        throw error;
      }
    },
    enabled: !!company?.id && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2
  });
  
  return {
    metrics,
    isLoading
  };
}
