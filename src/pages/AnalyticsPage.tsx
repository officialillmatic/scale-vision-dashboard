import React, { useState, useEffect } from 'react';
import { ProductionDashboardLayout } from '@/components/dashboard/ProductionDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CallFilterBar } from '@/components/analytics/CallFilterBar';
import { EmptyStateMessage } from '@/components/dashboard/EmptyStateMessage';
import { useCallData } from '@/hooks/useCallData';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { AgentAnalytics } from '@/components/analytics/AgentAnalytics';
import { UserAnalytics } from '@/components/analytics/UserAnalytics';
import { RevenueAnalytics } from '@/components/analytics/RevenueAnalytics';
import { ExportControls } from '@/components/analytics/ExportControls';
import { DemoAnalyticsSection } from '@/components/analytics/DemoAnalyticsSection';
import { BarChart3, Users, Bot, DollarSign, Download, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Updated CallData interface to include all fields
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
  const [previousCallData, setPreviousCallData] = useState<CallData[]>([]);
  const [filteredData, setFilteredData] = useState<CallData[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    new Date()
  ]);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!company?.id) {
      setIsLoading(false);
      return;
    }

    const fetchCalls = async () => {
      setIsLoading(true);
      try {
        // Fetch current period data
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

        // Fetch previous period data for comparison (previous 30 days)
        const previousPeriodStart = new Date();
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 60);
        const previousPeriodEnd = new Date();
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 30);

        const { data: previousData } = await supabase
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
          .gte('timestamp', previousPeriodStart.toISOString())
          .lte('timestamp', previousPeriodEnd.toISOString())
          .order('timestamp', { ascending: false });

        if (previousData) {
          const mappedPreviousData: CallData[] = previousData.map((call) => ({
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
          setPreviousCallData(mappedPreviousData);
        }
        
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

  const hasRealData = !isLoading && filteredData.length > 0;

  return (
    <ProductionDashboardLayout>
      <div className="space-y-8 w-full max-w-none">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Business Intelligence Platform 📊
              </h1>
              <p className="text-lg text-gray-600 font-medium">
                Comprehensive analytics and insights for your communication platform
              </p>
            </div>
            {!hasRealData && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setShowDemo(!showDemo)}
                  variant={showDemo ? "default" : "outline"}
                  className="flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>{showDemo ? "Hide Demo" : "View Demo"}</span>
                </Button>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Preview Mode
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* Show demo mode or real data */}
        {showDemo && !hasRealData ? (
          <DemoAnalyticsSection />
        ) : (
          <>
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
                  description="Analytics will appear here once you have call data. Start by syncing your calls or making your first call."
                  actionLabel={isSyncing ? "Syncing..." : "Sync Calls"}
                  onAction={handleSync}
                  isLoading={isSyncing}
                />
              </div>
            )}

            {/* Show content when we have data */}
            {(filteredData.length > 0 || isLoading) && (
              <>
                {/* Key Metrics Dashboard */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                      <TrendingUp className="h-6 w-6" />
                      <span>Key Performance Indicators</span>
                    </h2>
                    <p className="text-gray-600">Overview of your platform's core metrics and performance</p>
                  </div>
                  {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      {Array(4).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <MetricsDashboard data={filteredData} previousData={previousCallData} />
                  )}
                </div>
                
                {/* Analytics Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview" className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="agents" className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <span>Agents</span>
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </TabsTrigger>
                    <TabsTrigger value="revenue" className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Revenue</span>
                    </TabsTrigger>
                    <TabsTrigger value="export" className="flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
                      <p className="text-gray-600">Visual insights into call patterns, performance trends, and usage analytics</p>
                    </div>
                    {isLoading ? (
                      <div className="space-y-6">
                        <Skeleton className="h-[400px] rounded-lg" />
                        <div className="grid gap-6 md:grid-cols-2">
                          <Skeleton className="h-[300px] rounded-lg" />
                          <Skeleton className="h-[300px] rounded-lg" />
                        </div>
                      </div>
                    ) : (
                      <AnalyticsCharts data={filteredData} />
                    )}
                  </TabsContent>

                  <TabsContent value="agents" className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">Agent Performance Analytics</h2>
                      <p className="text-gray-600">Detailed performance metrics and utilization statistics for all agents</p>
                    </div>
                    {isLoading ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                          {Array(3).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-xl" />
                          ))}
                        </div>
                        <Skeleton className="h-[400px] rounded-lg" />
                      </div>
                    ) : (
                      <AgentAnalytics data={filteredData} />
                    )}
                  </TabsContent>

                  <TabsContent value="users" className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">User Engagement Analytics</h2>
                      <p className="text-gray-600">Insights into user behavior, engagement patterns, and activity metrics</p>
                    </div>
                    {isLoading ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                          {Array(4).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                          ))}
                        </div>
                        <Skeleton className="h-[400px] rounded-lg" />
                      </div>
                    ) : (
                      <UserAnalytics data={filteredData} />
                    )}
                  </TabsContent>

                  <TabsContent value="revenue" className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">Revenue & Cost Analytics</h2>
                      <p className="text-gray-600">Financial performance tracking, cost analysis, and revenue optimization insights</p>
                    </div>
                    {isLoading ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-4">
                          {Array(4).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                          ))}
                        </div>
                        <Skeleton className="h-[400px] rounded-lg" />
                      </div>
                    ) : (
                      <RevenueAnalytics data={filteredData} />
                    )}
                  </TabsContent>

                  <TabsContent value="export" className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-gray-900">Data Export & Reporting</h2>
                      <p className="text-gray-600">Export your analytics data in various formats for external analysis and reporting</p>
                    </div>
                    <ExportControls data={filteredData} dateRange={dateRange} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </ProductionDashboardLayout>
  );
};

export default AnalyticsPage;
