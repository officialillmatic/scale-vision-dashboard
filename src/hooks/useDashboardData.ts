
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "./useSuperAdmin";

interface DashboardMetrics {
  totalCalls: number;
  totalCost: string;
  totalMinutes: number;
  avgDuration: number;
}

export function useDashboardData() {
  const { user, company } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  return useQuery({
    queryKey: ['dashboard-data', user?.id, company?.id],
    queryFn: async (): Promise<{ metrics: DashboardMetrics }> => {
      if (!user) {
        return {
          metrics: {
            totalCalls: 0,
            totalCost: '$0.00',
            totalMinutes: 0,
            avgDuration: 0
          }
        };
      }

      try {
        let query = supabase
          .from('calls')
          .select('*')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Filter by company for non-super admins
        if (!isSuperAdmin && company?.id) {
          query = query.eq('company_id', company.id);
        }

        const { data: calls, error } = await query;

        if (error) {
          console.error('Error fetching dashboard data:', error);
          // Return default values on error instead of throwing
          return {
            metrics: {
              totalCalls: 0,
              totalCost: '$0.00',
              totalMinutes: 0,
              avgDuration: 0
            }
          };
        }

        const totalCalls = calls?.length || 0;
        const totalCost = calls?.reduce((sum, call) => sum + (call.cost_usd || 0), 0) || 0;
        const totalSeconds = calls?.reduce((sum, call) => sum + (call.duration_sec || 0), 0) || 0;
        const totalMinutes = Math.round(totalSeconds / 60);
        const avgDuration = totalCalls > 0 ? totalSeconds / totalCalls : 0;

        return {
          metrics: {
            totalCalls,
            totalCost: `$${totalCost.toFixed(2)}`,
            totalMinutes,
            avgDuration: Math.round(avgDuration)
          }
        };
      } catch (error) {
        console.error('Error in useDashboardData:', error);
        // Return default values on error
        return {
          metrics: {
            totalCalls: 0,
            totalCost: '$0.00',
            totalMinutes: 0,
            avgDuration: 0
          }
        };
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
