
export interface CallMetrics {
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

export interface DailyCallData {
  date: string;
  calls: number;
  minutes: number;
}

export interface CallOutcome {
  name: string;
  value: number;
  color: string;
}

export interface AgentUsage {
  id: string;
  name: string;
  calls: number;
  minutes: number;
  cost: number;
}
