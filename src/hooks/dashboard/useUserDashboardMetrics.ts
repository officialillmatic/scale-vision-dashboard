
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserCalls } from "../useCurrentUserCalls";

interface UserDashboardMetrics {
  totalCalls: number;
  totalCost: number;
  totalDuration: number;
  avgDuration: number;
  recentCallsCount: number;
  completedCallsCount: number;
  totalRevenue: number;
}

export const useUserDashboardMetrics = () => {
  const { user } = useAuth();
  const { userCalls, isLoading: isLoadingCalls } = useCurrentUserCalls();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['user-dashboard-metrics', user?.id, userCalls?.length],
    queryFn: (): UserDashboardMetrics => {
      console.log('🔍 [useUserDashboardMetrics] Computing metrics for calls:', userCalls?.length);

      if (!userCalls || userCalls.length === 0) {
        return {
          totalCalls: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          recentCallsCount: 0,
          completedCallsCount: 0,
          totalRevenue: 0
        };
      }

      const totalCalls = userCalls.length;
      const totalCost = userCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
      const totalRevenue = userCalls.reduce((sum, call) => sum + (call.revenue_amount || 0), 0);
      const totalDuration = userCalls.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
      const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
      
      // Recent calls (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCallsCount = userCalls.filter(call => 
        new Date(call.start_timestamp) > oneDayAgo
      ).length;

      const completedCallsCount = userCalls.filter(call => 
        call.call_status === 'completed'
      ).length;

      const metrics = {
        totalCalls,
        totalCost,
        totalDuration,
        avgDuration,
        recentCallsCount,
        completedCallsCount,
        totalRevenue
      };

      console.log('🔍 [useUserDashboardMetrics] Computed metrics:', metrics);
      return metrics;
    },
    enabled: !isLoadingCalls && !!userCalls,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  return {
    metrics: metrics || {
      totalCalls: 0,
      totalCost: 0,
      totalDuration: 0,
      avgDuration: 0,
      recentCallsCount: 0,
      completedCallsCount: 0,
      totalRevenue: 0
    },
    isLoading: isLoading || isLoadingCalls
  };
};
