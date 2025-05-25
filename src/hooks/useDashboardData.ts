
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ChartDataPoint {
  date: string;
  calls: number;
  duration: number;
}

export function useDashboardData() {
  const { company } = useAuth();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
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

        const { data, error: queryError } = await supabase
          .from('calls')
          .select('timestamp, duration_sec')
          .eq('company_id', company.id)
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: true });

        if (queryError) {
          throw queryError;
        }

        // Group data by date
        const groupedData = (data || []).reduce((acc: Record<string, { calls: number; duration: number }>, call) => {
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
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [company?.id]);

  return { chartData, isLoading, error };
}
