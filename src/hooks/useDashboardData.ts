
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CallData } from "@/services/callService";
import { addDays, format, startOfWeek, endOfWeek, subDays, subWeeks } from "date-fns";

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

export const useDashboardData = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  
  // Fetch current period data
  const { data: recentCalls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['dashboard-calls', companyId],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId) return [];
      
      try {
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            agent:agent_id (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', companyId)
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("Error fetching dashboard calls:", error);
          return [];
        }
        
        return (data || []).map(call => ({
          id: call.id,
          call_id: call.call_id,
          timestamp: new Date(call.timestamp),
          duration_sec: call.duration_sec,
          cost_usd: call.cost_usd,
          sentiment: call.sentiment || "neutral",
          sentiment_score: call.sentiment_score,
          disconnection_reason: call.disconnection_reason,
          call_status: call.call_status,
          from: call.from || call.from_number || 'unknown',
          to: call.to || call.to_number || 'unknown',
          from_number: call.from_number || call.from || 'unknown',
          to_number: call.to_number || call.to || 'unknown',
          audio_url: call.audio_url || call.recording_url,
          recording_url: call.recording_url || call.audio_url,
          transcript: call.transcript,
          transcript_url: call.transcript_url,
          user_id: call.user_id,
          result_sentiment: call.result_sentiment,
          company_id: call.company_id,
          call_type: call.call_type || 'phone_call',
          latency_ms: call.latency_ms || 0,
          call_summary: call.call_summary,
          start_time: new Date(call.start_time || call.timestamp),
          disposition: call.disposition,
          agent: call.agent
        }));
      } catch (error) {
        console.error("Error in dashboard calls query:", error);
        return [];
      }
    },
    enabled: !!companyId
  });

  // Fetch previous period data for comparison
  const { data: previousCalls } = useQuery({
    queryKey: ['dashboard-previous-calls', companyId],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId) return [];
      
      try {
        // Get data from one week before
        const oneWeekAgo = subDays(new Date(), 7);
        const twoWeeksAgo = subDays(new Date(), 14);
        
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            agent:agent_id (
              id, 
              name,
              rate_per_minute
            )
          `)
          .eq('company_id', companyId)
          .gte('timestamp', twoWeeksAgo.toISOString())
          .lte('timestamp', oneWeekAgo.toISOString())
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("Error fetching previous dashboard calls:", error);
          return [];
        }
        
        return (data || []).map(call => ({
          id: call.id,
          call_id: call.call_id,
          timestamp: new Date(call.timestamp),
          duration_sec: call.duration_sec,
          cost_usd: call.cost_usd,
          sentiment: call.sentiment || "neutral",
          sentiment_score: call.sentiment_score,
          disconnection_reason: call.disconnection_reason,
          call_status: call.call_status,
          from: call.from || call.from_number || 'unknown',
          to: call.to || call.to_number || 'unknown',
          from_number: call.from_number || call.from || 'unknown',
          to_number: call.to_number || call.to || 'unknown',
          audio_url: call.audio_url || call.recording_url,
          recording_url: call.recording_url || call.audio_url,
          transcript: call.transcript,
          transcript_url: call.transcript_url,
          user_id: call.user_id,
          result_sentiment: call.result_sentiment,
          company_id: call.company_id,
          call_type: call.call_type || 'phone_call',
          latency_ms: call.latency_ms || 0,
          call_summary: call.call_summary,
          start_time: new Date(call.start_time || call.timestamp),
          disposition: call.disposition,
          agent: call.agent
        }));
      } catch (error) {
        console.error("Error in previous dashboard calls query:", error);
        return [];
      }
    },
    enabled: !!companyId
  });

  // Calculate agent usage stats
  const agentUsage: AgentUsage[] = useMemo(() => {
    if (!recentCalls || recentCalls.length === 0) return [];
    
    // Group calls by agent
    const usageByAgent = recentCalls.reduce((acc, call) => {
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
  }, [recentCalls]);

  // Calculate percentage change between current and previous period
  const calculatePercentChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? "+100%" : "0%";
    
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
  };
  
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

  // Calculate metrics based on the calls data
  const metrics: CallMetrics = {
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

  // Generate daily call data for the chart
  const dailyCallData: DailyCallData[] = calculateDailyCallData(recentCalls || []);

  // Calculate call outcomes from actual data
  const callOutcomes: CallOutcome[] = [
    {
      name: "Success",
      value: recentCalls?.filter(call => call.call_status === 'completed').length || 0,
      color: "#10B981"
    },
    {
      name: "Hangup",
      value: recentCalls?.filter(call => call.disconnection_reason === 'hangup').length || 0,
      color: "#F59E0B"
    },
    {
      name: "Voicemail",
      value: recentCalls?.filter(call => call.call_status === 'voicemail').length || 0,
      color: "#6366F1"
    },
    {
      name: "No Answer",
      value: recentCalls?.filter(call => call.call_status === 'no-answer').length || 0,
      color: "#EF4444"
    }
  ];

  return {
    metrics,
    dailyCallData,
    callOutcomes,
    agentUsage,
    recentCalls: recentCalls?.slice(0, 5) || [],
    isLoading: isLoadingCalls || !companyId
  };
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function calculateDailyCallData(calls: CallData[]): DailyCallData[] {
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
}
