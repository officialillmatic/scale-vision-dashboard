
import { useMemo } from "react";
import { CallData } from "@/services/callService";
import { CallMetrics } from "./types";
import { formatDuration, calculatePercentChange } from "./calculationUtils";

export const useMetricsCalculation = (
  recentCalls: CallData[] | undefined,
  previousCalls: CallData[] | undefined
): CallMetrics => {
  return useMemo(() => {
    // Get metrics for the current period
    const currentTotalCalls = recentCalls?.length || 0;
    const currentTotalMinutes = recentCalls?.reduce((sum, call) => sum + call.duration_sec / 60, 0) || 0;
    const currentAvgDuration = currentTotalCalls > 0 ? 
      recentCalls!.reduce((sum, call) => sum + call.duration_sec, 0) / currentTotalCalls : 0;
    const currentTotalCost = recentCalls?.reduce((sum, call) => {
      const rate = call.agent?.rate_per_minute || 0.02;
      return sum + ((call.duration_sec / 60) * rate);
    }, 0) || 0;
    
    // Get metrics for the previous period
    const previousTotalCalls = previousCalls?.length || 0;
    const previousTotalMinutes = previousCalls?.reduce((sum, call) => sum + call.duration_sec / 60, 0) || 0;
    const previousAvgDuration = previousTotalCalls > 0 ? 
      previousCalls!.reduce((sum, call) => sum + call.duration_sec, 0) / previousTotalCalls : 0;
    const previousTotalCost = previousCalls?.reduce((sum, call) => sum + call.cost_usd, 0) || 0;

    return {
      totalCalls: currentTotalCalls,
      totalMinutes: Math.round(currentTotalMinutes),
      avgDuration: formatDuration(currentAvgDuration),
      totalCost: `$${currentTotalCost.toFixed(2)}`,
      percentChange: {
        calls: calculatePercentChange(currentTotalCalls, previousTotalCalls),
        minutes: calculatePercentChange(currentTotalMinutes, previousTotalMinutes),
        duration: calculatePercentChange(currentAvgDuration, previousAvgDuration),
        cost: calculatePercentChange(currentTotalCost, previousTotalCost)
      }
    };
  }, [recentCalls, previousCalls]);
};
