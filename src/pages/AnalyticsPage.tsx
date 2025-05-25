
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CallDataTable } from '@/components/analytics/CallDataTable';
import { EnhancedCallStatistics } from '@/components/analytics/EnhancedCallStatistics';
import { CallChart } from '@/components/analytics/CallChart';
import { CallFilterBar } from '@/components/analytics/CallFilterBar';
import { EmptyStateMessage } from '@/components/dashboard/EmptyStateMessage';
import { useCallData } from '@/hooks/useCallData';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// Updated CallData interface to include all Retell AI fields
export interface CallData {
  id: string;
  call_id: string;
  timestamp: Date;
  duration_sec: number;
  cost_usd: number;
  sentiment: string | null;
  sentiment_score: number | null;
  disconnection_reason: string | null;
  call_status: string;
  from: string;
  to: string;
  from_number: string | null;
  to_number: string | null;
  audio_url: string | null;
  recording_url: string | null;
  transcript: string | null;
  transcript_url: string | null;
  user_id: string;
  company_id: string;
  call_type: string;
  latency_ms: number | null;
  call_summary: string | null;
  disposition: string | null;
  agent: {
    id: string;
    name: string;
    rate_per_minute?: number;
    retell_agent_id?: string;
  } | null;
}

const AnalyticsPage = () => {
  const { company } = useAuth();
  const { handleSync, isSyncing } = useCallData();
  const [isLoading, setIsLoading] = useState(true);
  const [callData, setCallData] = useState<CallData[]>([]);
  const [filteredData, setFilteredData] = useState<CallData[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    new Date()
  ]);

  useEffect(() => {
    if (!company?.id) {
      setIsLoading(false);
      return;
    }

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
        const mappedData: CallData[] = (data || []).map((call) => ({
          id: call.id,
          call_id: call.call_id,
          timestamp: new Date(call.timestamp),
          duration_sec: call.duration_sec,
          cost_usd: call.cost_usd,
          sentiment: call.sentiment,
          sentiment_score: call.sentiment_score,
          disconnection_reason: call.disconnection_reason,
          call_status: call.call_status,
          from: call.from,
          to: call.to,
          from_number: call.from_number,
          to_number: call.to_number,
          audio_url: call.audio_url,
          recording_url: call.recording_url,
          transcript: call.transcript,
          transcript_url: call.transcript_url,
          user_id: call.user_id,
          company_id: call.company_id,
          call_type: call.call_type || 'phone_call',
          latency_ms: call.latency_ms || 0,
          call_summary: call.call_summary,
          disposition: call.disposition,
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
      <div className="container mx-auto py-4 w-full max-w-none">
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
        
        {/* Show empty state when no data */}
        {!isLoading && filteredData.length === 0 && (
          <div className="mt-8">
            <EmptyStateMessage
              title="No data available – sync your first call"
              description="Analytics will appear here once you have call data. Start by syncing your calls or making your first AI call."
              actionLabel={isSyncing ? "Syncing..." : "Sync Calls"}
              onAction={handleSync}
              isLoading={isSyncing}
            />
          </div>
        )}

        {/* Show content when we have data */}
        {(filteredData.length > 0 || isLoading) && (
          <>
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
