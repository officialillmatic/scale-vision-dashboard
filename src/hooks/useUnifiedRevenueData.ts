
import { useMemo } from 'react';
import { useRevenueData } from './useRevenueData';
import { useRetellCallData } from './useRetellCallData';

export interface UnifiedRevenueMetrics {
  total_revenue: number;
  total_calls: number;
  avg_revenue_per_call: number;
  top_performing_agent: string;
  revenue_by_day: Array<{
    date: string;
    revenue: number;
    calls: number;
  }>;
  success_rate: number;
  total_duration_min: number;
  avg_duration_sec: number;
}

export function useUnifiedRevenueData(
  startDate?: Date,
  endDate?: Date
) {
  const legacyRevenue = useRevenueData(startDate, endDate);
  const retellData = useRetellCallData(startDate, endDate);

  const unifiedMetrics = useMemo((): UnifiedRevenueMetrics => {
    // Combine legacy revenue data with new retell data
    const legacyTotalRevenue = legacyRevenue.revenueMetrics?.total_revenue || 0;
    const retellTotalRevenue = retellData.retellMetrics?.total_revenue || 0;
    
    const legacyTotalCalls = legacyRevenue.revenueMetrics?.total_calls || 0;
    const retellTotalCalls = retellData.retellMetrics?.total_calls || 0;
    
    const totalRevenue = legacyTotalRevenue + retellTotalRevenue;
    const totalCalls = legacyTotalCalls + retellTotalCalls;
    
    // Combine daily revenue data
    const legacyDaily = legacyRevenue.revenueMetrics?.revenue_by_day || [];
    const retellDaily = retellData.retellDailyStats || [];
    
    // Create a map to combine daily data by date
    const dailyRevenueMap = new Map<string, { revenue: number; calls: number }>();
    
    // Add legacy data
    legacyDaily.forEach(day => {
      const dateKey = day.date;
      dailyRevenueMap.set(dateKey, {
        revenue: day.revenue,
        calls: day.calls
      });
    });
    
    // Add retell data
    retellDaily.forEach(day => {
      const dateKey = day.date;
      const existing = dailyRevenueMap.get(dateKey) || { revenue: 0, calls: 0 };
      dailyRevenueMap.set(dateKey, {
        revenue: existing.revenue + day.total_revenue,
        calls: existing.calls + day.call_count
      });
    });
    
    // Convert map back to array
    const revenue_by_day = Array.from(dailyRevenueMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      calls: data.calls
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      total_revenue: totalRevenue,
      total_calls: totalCalls,
      avg_revenue_per_call: totalCalls > 0 ? totalRevenue / totalCalls : 0,
      top_performing_agent: legacyRevenue.revenueMetrics?.top_performing_agent || 'N/A',
      revenue_by_day,
      success_rate: retellData.retellMetrics?.success_rate || 0,
      total_duration_min: retellData.retellMetrics?.total_duration_min || 0,
      avg_duration_sec: retellData.retellMetrics?.avg_duration_sec || 0,
    };
  }, [legacyRevenue.revenueMetrics, retellData.retellMetrics, retellData.retellDailyStats]);

  const unifiedTransactions = useMemo(() => {
    // Return legacy transactions for now, but could be extended to include retell transactions
    return legacyRevenue.revenueTransactions || [];
  }, [legacyRevenue.revenueTransactions]);

  const isLoading = legacyRevenue.isLoading || retellData.isLoading;

  return {
    revenueMetrics: unifiedMetrics,
    revenueTransactions: unifiedTransactions,
    retellCalls: retellData.retellCalls,
    retellOutcomes: retellData.retellOutcomes,
    isLoading,
  };
}
