
import React from "react";
import { UnifiedRevenueMetricsCards } from "./UnifiedRevenueMetricsCards";

interface DashboardKPICardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function DashboardKPICards({ startDate, endDate }: DashboardKPICardsProps) {
  return <UnifiedRevenueMetricsCards startDate={startDate} endDate={endDate} />;
}
