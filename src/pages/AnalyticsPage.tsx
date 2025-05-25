
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
      <div className="space-y-8 w-full max-w-none">
        {/* Header Section */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Call Analytics 📊
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Comprehensive analysis of your AI call performance and outcomes
          </p>
        </div>
        
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6">
          <CallFilterBar 
            dateRange={dateRange} 
            setDateRange={setDateRange} 
            totalCalls={filteredData.length}
            isLoading={isLoading}
          />
        </div>
        
        {/* Show empty state when no data */}
        {!isLoading && filteredData.length === 0 && (
          <div className="mt-8">
            <EmptyStateMessage
              title="No analytics data available yet"
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
            {/* Statistics Cards */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Performance Statistics</h2>
                <p className="text-gray-600">Key metrics for your selected time period</p>
              </div>
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array(6).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : (
                <EnhancedCallStatistics data={filteredData} />
              )}
            </div>
            
            {/* Chart Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Call Volume Trends</h2>
                <p className="text-gray-600">Visual representation of your call activity</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6">
                {isLoading ? (
                  <Skeleton className="h-[350px] rounded-lg" />
                ) : (
                  <CallChart data={filteredData} />
                )}
              </div>
            </div>
            
            {/* Data Table */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Detailed Call Data</h2>
                <p className="text-gray-600">Complete call records with full details</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
                <CallDataTable data={filteredData} isLoading={isLoading} />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
