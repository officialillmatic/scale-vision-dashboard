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

interface AgentUsage {
  id: string;
  name: string;
  calls: number;
  minutes: number;
  cost: number;
}

interface CallOutcome {
  status: string;
  count: number;
}

interface ChartData {
  date: string;
  calls: number;
  cost: number;
}

export function useDashboardData() {
  const { user, company } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();

  return useQuery({
    queryKey: ['dashboard-data', user?.id, company?.id],
    queryFn: async (): Promise<{ 
      metrics: DashboardMetrics;
      agentUsage: AgentUsage[];
      callOutcomes: CallOutcome[];
      chartData: ChartData[];
    }> => {
      if (!user) {
        return {
          metrics: {
            totalCalls: 0,
            totalCost: '$0.00',
            totalMinutes: 0,
            avgDuration: 0
          },
          agentUsage: [],
          callOutcomes: [],
          chartData: []
        };
      }

      try {
        // MODIFICACIÓN: Incluir datos del agente en la consulta
        let query = supabase
          .from('calls')
          .select(`
            *,
            call_agent:agents!calls_agent_id_fkey(id, name, rate_per_minute)
          `)
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Filter by company for non-super admins
        if (!isSuperAdmin && company?.id) {
          query = query.eq('company_id', company.id);
        }

        const { data: calls, error } = await query;

        if (error) {
          console.error('Error fetching dashboard data:', error);
          
          // Handle specific error types gracefully
          if (error.code === 'PGRST301' || error.message?.includes('no rows')) {
            console.log('No calls found for dashboard - returning empty metrics');
          } else if (error.message?.includes('permission denied')) {
            console.error('Permission denied for dashboard data');
          }
          
          // Return default values on error instead of throwing
          return {
            metrics: {
              totalCalls: 0,
              totalCost: '$0.00',
              totalMinutes: 0,
              avgDuration: 0
            },
            agentUsage: [],
            callOutcomes: [],
            chartData: []
          };
        }

        const totalCalls = calls?.length || 0;
        const totalSeconds = calls?.reduce((sum, call) => sum + (call.duration_sec || 0), 0) || 0;
        const totalMinutes = Math.round(totalSeconds / 60);
        const avgDuration = totalCalls > 0 ? totalSeconds / totalCalls : 0;

        // CORRECCIÓN: Calcular costo total usando tarifa del agente
        const totalCost = calls?.reduce((sum, call) => {
          const durationMinutes = (call.duration_sec || 0) / 60;
          const agentRate = call.call_agent?.rate_per_minute || 0;
          return sum + (durationMinutes * agentRate);
        }, 0) || 0;

        // CORRECCIÓN: Calculate agent usage con cálculo correcto de costos
        const agentUsageMap = new Map<string, AgentUsage>();
        calls?.forEach(call => {
          if (call.agent_id && call.call_agent) {
            const existing = agentUsageMap.get(call.agent_id) || {
              id: call.agent_id,
              name: call.call_agent.name || 'Unknown Agent',
              calls: 0,
              minutes: 0,
              cost: 0
            };
            
            const durationMinutes = (call.duration_sec || 0) / 60;
            const agentRate = call.call_agent.rate_per_minute || 0;
            
            existing.calls += 1;
            existing.minutes += durationMinutes;
            // CORRECCIÓN CLAVE: Usar tarifa del agente para calcular costo
            existing.cost += durationMinutes * agentRate;
            
            agentUsageMap.set(call.agent_id, existing);
          }
        });

        // Calculate call outcomes
        const outcomeMap = new Map<string, number>();
        calls?.forEach(call => {
          const status = call.call_status || 'unknown';
          outcomeMap.set(status, (outcomeMap.get(status) || 0) + 1);
        });

        const callOutcomes = Array.from(outcomeMap.entries()).map(([status, count]) => ({
          status,
          count
        }));

        // CORRECCIÓN: Calculate chart data con cálculo correcto de costos
        const chartMap = new Map<string, { calls: number; cost: number }>();
        calls?.forEach(call => {
          const date = new Date(call.timestamp).toISOString().split('T')[0];
          const existing = chartMap.get(date) || { calls: 0, cost: 0 };
          
          const durationMinutes = (call.duration_sec || 0) / 60;
          const agentRate = call.call_agent?.rate_per_minute || 0;
          
          existing.calls += 1;
          // CORRECCIÓN CLAVE: Usar tarifa del agente para calcular costo
          existing.cost += durationMinutes * agentRate;
          chartMap.set(date, existing);
        });

        const chartData = Array.from(chartMap.entries()).map(([date, data]) => ({
          date,
          calls: data.calls,
          cost: data.cost
        })).sort((a, b) => a.date.localeCompare(b.date));

        return {
          metrics: {
            totalCalls,
            totalCost: `$${totalCost.toFixed(2)}`,
            totalMinutes,
            avgDuration: Math.round(avgDuration)
          },
          agentUsage: Array.from(agentUsageMap.values()),
          callOutcomes,
          chartData
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
          },
          agentUsage: [],
          callOutcomes: [],
          chartData: []
        };
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
      if (error?.message?.includes("permission denied") || error?.code === '42501') {
        return false;
      }
      return failureCount < 2;
    }
  });
}