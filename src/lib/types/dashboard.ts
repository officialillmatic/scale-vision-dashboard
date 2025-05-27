
export interface DashboardMetrics {
  totalCalls: number;
  totalMinutes: number;
  avgDuration: string;
  totalCost: string;
  percentChange: {
    calls: string;
    minutes: string;
    duration: string;
    cost: string;
  };
}
