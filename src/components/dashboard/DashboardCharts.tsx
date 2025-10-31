
import React from "react";
import { UnifiedRevenueChart } from "./UnifiedRevenueChart";

interface DashboardChartsProps {
  startDate?: Date;
  endDate?: Date;
}

export function DashboardCharts({ startDate, endDate }: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Analytics</h2>
        <UnifiedRevenueChart startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}
