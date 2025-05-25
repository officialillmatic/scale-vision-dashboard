
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ChartDataPoint {
  date: string;
  calls: number;
  duration: number;
}

interface CallMetrics {
  totalCalls: number;
  totalMinutes: number;
  totalCost: string;
  percentChange: {
    calls: string;
    minutes: string;
    cost: string;
  };
}

interface CallOutcome {
  name: string;
  value: number;
  color: string;
}

interface AgentUsage {
  id: string;
  name: string;
  calls: number;
  minutes: number;
  cost: number;
}

export function useDashboardData() {
  const { company } = useAuth();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [metrics, setMetrics] = useState<CallMetrics>({
    totalCalls: 0,
    totalMinutes: 0,
    totalCost: '$0.00',
    percentChange: {
      calls: '0%',
      minutes: '0%',
      cost: '0%'
    }
  });
  const [callOutcomes, setCallOutcomes] = useState<CallOutcome[]>([]);
  const [agentUsage, setAgentUsage] = useState<AgentUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!company?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get last 7 days of data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('timestamp, duration_sec, cost_usd, agent_id, agents(id, name)')
          .eq('company_id', company.id)
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: true });

        if (callsError) {
          throw callsError;
        }

        // Group data by date for charts
        const groupedData = (callsData || []).reduce((acc: Record<string, { calls: number; duration: number }>, call) => {
          const date = new Date(call.timestamp).toDateString();
          if (!acc[date]) {
            acc[date] = { calls: 0, duration: 0 };
          }
          acc[date].calls += 1;
          acc[date].duration += call.duration_sec / 60; // Convert to minutes
          return acc;
        }, {});

        // Convert to array format for charts
        const chartDataArray = Object.entries(groupedData).map(([date, stats]) => ({
          date,
          calls: stats.calls,
          duration: Math.round(stats.duration)
        }));

        setChartData(chartDataArray);

        // Calculate metrics
        const totalCalls = callsData?.length || 0;
        const totalMinutes = Math.round((callsData || []).reduce((sum, call) => sum + call.duration_sec / 60, 0));
        const totalCost = (callsData || []).reduce((sum, call) => sum + (call.cost_usd || 0), 0);

        setMetrics({
          totalCalls,
          totalMinutes,
          totalCost: `$${totalCost.toFixed(2)}`,
          percentChange: {
            calls: '0%', // Placeholder for now
            minutes: '0%',
            cost: '0%'
          }
        });

        // Calculate call outcomes
        const outcomes = (callsData || []).reduce((acc: Record<string, number>, call) => {
          const outcome = call.call_status || 'unknown';
          acc[outcome] = (acc[outcome] || 0) + 1;
          return acc;
        }, {});

        const outcomeColors = {
          completed: '#22c55e',
          failed: '#ef4444',
          unknown: '#6b7280'
        };

        const callOutcomesData = Object.entries(outcomes).map(([name, value]) => ({
          name,
          value,
          color: outcomeColors[name as keyof typeof outcomeColors] || '#6b7280'
        }));

        setCallOutcomes(callOutcomesData);

        // Calculate agent usage
        const agentStats = (callsData || []).reduce((acc: Record<string, AgentUsage>, call) => {
          if (call.agent_id && call.agents) {
            const agentId = call.agent_id;
            const agentName = call.agents.name || 'Unknown Agent';
            
            if (!acc[agentId]) {
              acc[agentId] = {
                id: agentId,
                name: agentName,
                calls: 0,
                minutes: 0,
                cost: 0
              };
            }
            
            acc[agentId].calls += 1;
            acc[agentId].minutes += call.duration_sec / 60;
            acc[agentId].cost += call.cost_usd || 0;
          }
          return acc;
        }, {});

        setAgentUsage(Object.values(agentStats));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [company?.id]);

  return { 
    chartData, 
    metrics, 
    callOutcomes, 
    agentUsage, 
    isLoading, 
    error 
  };
}
