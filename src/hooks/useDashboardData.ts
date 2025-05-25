
import { useMemo } from "react";
import { useCallsData } from "./dashboard/useCallsData";
import { useMetricsCalculation } from "./dashboard/useMetricsCalculation";
import { calculateDailyCallData, calculateAgentUsage, calculateCallOutcomes } from "./dashboard/calculationUtils";

// Re-export types for backward compatibility
export type { CallMetrics, DailyCallData, CallOutcome, AgentUsage } from "./dashboard/types";

export const useDashboardData = () => {
  const { recentCalls, previousCalls, isLoading } = useCallsData();
  
  const metrics = useMetricsCalculation(recentCalls, previousCalls);
  
  // Calculate agent usage stats
  const agentUsage = useMemo(() => calculateAgentUsage(recentCalls || []), [recentCalls]);

  // Generate daily call data for the chart
  const dailyCallData = useMemo(() => calculateDailyCallData(recentCalls || []), [recentCalls]);

  // Calculate call outcomes from actual data
  const callOutcomes = useMemo(() => calculateCallOutcomes(recentCalls || []), [recentCalls]);

  return {
    metrics,
    dailyCallData,
    callOutcomes,
    agentUsage,
    recentCalls: recentCalls?.slice(0, 5) || [],
    isLoading
  };
};
