
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CallData } from "@/services/callService";
import { addDays, format, startOfWeek, endOfWeek } from "date-fns";

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

export const useDashboardData = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  
  const { data: recentCalls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['dashboard-calls', companyId],
    queryFn: async (): Promise<CallData[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return (data || []).map(call => ({
        id: call.id,
        call_id: call.call_id,
        timestamp: new Date(call.timestamp),
        duration_sec: call.duration_sec,
        cost_usd: call.cost_usd,
        sentiment: call.sentiment,
        disconnection_reason: call.disconnection_reason,
        call_status: call.call_status,
        from: call.from,
        to: call.to,
        audio_url: call.audio_url,
        transcript: call.transcript,
        user_id: call.user_id
      }));
    },
    enabled: !!companyId
  });

  // Calculate metrics based on the calls data
  const metrics: CallMetrics = {
    totalCalls: recentCalls?.length || 0,
    totalMinutes: recentCalls?.reduce((sum, call) => sum + call.duration_sec / 60, 0) || 0,
    avgDuration: formatDuration(recentCalls?.reduce((sum, call) => sum + call.duration_sec, 0) / (recentCalls?.length || 1)),
    totalCost: `$${(recentCalls?.reduce((sum, call) => sum + call.cost_usd, 0) || 0).toFixed(2)}`,
    percentChange: {
      calls: "+24%", // Mock data for now, would require historical comparison
      minutes: "+18%",
      duration: "-5%",
      cost: "+12%"
    }
  };

  // Generate daily call data for the chart
  const dailyCallData: DailyCallData[] = calculateDailyCallData(recentCalls || []);

  // Calculate call outcomes
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
    recentCalls: recentCalls?.slice(0, 5) || [],
    isLoading: isLoadingCalls
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
