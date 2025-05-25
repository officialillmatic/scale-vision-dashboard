
import { format, addDays, startOfWeek } from "date-fns";
import { CallData } from "@/services/callService";
import { DailyCallData, CallOutcome, AgentUsage } from "./types";

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const calculatePercentChange = (current: number, previous: number): string => {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
};

export const calculateDailyCallData = (calls: CallData[]): DailyCallData[] => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start from Monday
  
  // Generate data for the last 7 days
  const dailyData: DailyCallData[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateStr = format(date, 'EEE');
    
    // Filter calls for this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayCalls = calls.filter(call => 
      call.timestamp >= dayStart && call.timestamp <= dayEnd
    );
    
    dailyData.push({
      date: dateStr,
      calls: dayCalls.length,
      minutes: Math.round(dayCalls.reduce((sum, call) => sum + call.duration_sec / 60, 0))
    });
  }
  
  return dailyData;
};

export const calculateAgentUsage = (calls: CallData[]): AgentUsage[] => {
  if (!calls || calls.length === 0) return [];
  
  // Group calls by agent
  const usageByAgent = calls.reduce((acc, call) => {
    const agentId = call.agent?.id || 'unknown';
    const agentName = call.agent?.name || 'Unknown Agent';
    const durationMinutes = call.duration_sec / 60;
    const rate = call.agent?.rate_per_minute || 0.02;
    const cost = durationMinutes * rate;
    
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
    acc[agentId].minutes += durationMinutes;
    acc[agentId].cost += cost;
    
    return acc;
  }, {} as Record<string, AgentUsage>);
  
  // Convert to array and sort by call count
  return Object.values(usageByAgent).sort((a, b) => b.calls - a.calls);
};

export const calculateCallOutcomes = (calls: CallData[]): CallOutcome[] => [
  {
    name: "Success",
    value: calls?.filter(call => call.call_status === 'completed').length || 0,
    color: "#10B981"
  },
  {
    name: "Hangup",
    value: calls?.filter(call => call.disconnection_reason === 'hangup').length || 0,
    color: "#F59E0B"
  },
  {
    name: "Voicemail",
    value: calls?.filter(call => call.call_status === 'voicemail').length || 0,
    color: "#6366F1"
  },
  {
    name: "No Answer",
    value: calls?.filter(call => call.call_status === 'no-answer').length || 0,
    color: "#EF4444"
  }
];
