import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CallDataTable } from '@/components/analytics/CallDataTable';
import { EnhancedCallStatistics } from '@/components/analytics/EnhancedCallStatistics';
import { CallChart } from '@/components/analytics/CallChart';
import { CallFilterBar } from '@/components/analytics/CallFilterBar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// Define the CallData interface
export interface CallData {
  id: string;
  call_id: string;
  timestamp: Date;
  duration_sec: number;
  cost_usd: number;
  sentiment: string | null;
  disconnection_reason: string | null;
  call_status: string;
  from: string;
  to: string;
  audio_url: string | null;
  transcript: string | null;
  user_id: string;
  company_id: string;
  call_type: string;
  latency_ms: number;
  call_summary: string | null;
  agent: {
    id: string;
    name: string;
    rate_per_minute?: number;
    retell_agent_id?: string;
  } | null;
}

const AnalyticsPage = () => {
  const { company } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [callData, setCallData] = useState<CallData[]>([]);
  const [filteredData, setFilteredData] = useState<CallData[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    new Date()
  ]);

  useEffect(() => {
    if (!company?.id) return;

    const fetchCalls = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('calls')
          .select(`
            *,
            agent:agent_id (
              id,
              name,
              rate_per_minute,
              retell_agent_id
            )
          `)
          .eq('company_id', company.id)
          .order('timestamp', { ascending: false });
          
        if (error) {
          console.error('Error fetching call data:', error);
          setCallData([]);
          setFilteredData([]);
          return;
        }
        
        // Map the data to the CallData interface with proper date conversion
        const mappedData: CallData[] = data.map((call) => ({
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
          user_id: call.user_id,
          company_id: call.company_id,
          call_type: call.call_type || 'phone_call',
          latency_ms: call.latency_ms || 0,
          call_summary: call.call_summary,
          agent: call.agent
        }));
        
        setCallData(mappedData);
        setFilteredData(mappedData);
        
      } catch (error) {
        console.error("Error in analytics calls query:", error);
        setCallData([]);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCalls();
  }, [company]);

  // Filter the data based on the date range
  useEffect(() => {
    if (!callData.length) return;
    
    const [start, end] = dateRange;
    
    // If no date range is selected, show all data
    if (!start && !end) {
      setFilteredData(callData);
      return;
    }
    
    // Filter based on date range
    const filtered = callData.filter(call => {
      const callDate = call.timestamp;
      if (start && end) {
        return callDate >= start && callDate <= end;
      }
      if (start) {
        return callDate >= start;
      }
      if (end) {
        return callDate <= end;
      }
      return true;
    });
    
    setFilteredData(filtered);
  }, [dateRange, callData]);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold mb-2">Call Analytics</h1>
        <p className="text-muted-foreground mb-6">
          Comprehensive analysis of your AI call performance and outcomes
        </p>
        
        <CallFilterBar 
          dateRange={dateRange} 
          setDateRange={setDateRange} 
          totalCalls={filteredData.length}
          isLoading={isLoading}
        />
        
        <div className="mt-6 mb-8">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <EnhancedCallStatistics data={filteredData} />
          )}
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Call Volume</h2>
          {isLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <CallChart data={filteredData} />
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4">Detailed Call Data</h2>
          <CallDataTable data={filteredData} isLoading={isLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
