
import React, { useState, useEffect } from 'react';
import { ProductionDashboardLayout } from '@/components/dashboard/ProductionDashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRetellCalls } from '@/hooks/useRetellCalls';
import { CallFilterBar } from '@/components/analytics/CallFilterBar';
import { EmptyStateMessage } from '@/components/dashboard/EmptyStateMessage';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricsDashboard } from '@/components/analytics/MetricsDashboard';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { AgentAnalytics } from '@/components/analytics/AgentAnalytics';
import { UserAnalytics } from '@/components/analytics/UserAnalytics';
import { RevenueAnalytics } from '@/components/analytics/RevenueAnalytics';
import { ExportControls } from '@/components/analytics/ExportControls';
import { DemoAnalyticsSection } from '@/components/analytics/DemoAnalyticsSection';
import { BarChart3, Users, Bot, DollarSign, Download, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Updated CallData interface to match retell_calls structure
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
  const { retellCalls, isLoading, error, refetch } = useRetellCalls();
  const [filteredData, setFilteredData] = useState<CallData[]>([]);
  const [previousCallData, setPreviousCallData] = useState<CallData[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
    new Date()
  ]);
  const [showDemo, setShowDemo] = useState(false);

  // Debug logging for component state
  useEffect(() => {
    console.log('🔍 [AnalyticsPage] Component state update:', {
      retellCallsLength: retellCalls?.length || 0,
      filteredDataLength: filteredData?.length || 0,
      isLoading,
      hasError: !!error,
      errorMessage: error?.message,
      dateRange,
      companyId: company?.id
    });
  }, [retellCalls, filteredData, isLoading, error, dateRange, company?.id]);

  // Transform retell calls to CallData format
  useEffect(() => {
    console.log('🔍 [AnalyticsPage] Transforming retell calls data...');
    console.log('🔍 [AnalyticsPage] Raw retell calls:', retellCalls);

    if (retellCalls && retellCalls.length > 0) {
      const transformedData: CallData[] = retellCalls.map(call => {
        const transformed = {
          id: call.id,
          call_id: call.call_id,
          timestamp: new Date(call.start_timestamp),
          duration_sec: call.duration_sec,
          cost_usd: call.cost_usd,
          sentiment: call.sentiment,
          sentiment_score: null, // Not available in retell_calls
          disconnection_reason: null, // Not available in retell_calls
          call_status: call.call_status,
          from: call.from_number || 'Unknown',
          to: call.to_number || 'Unknown',
          from_number: call.from_number,
          to_number: call.to_number,
          audio_url: call.recording_url,
          recording_url: call.recording_url,
          transcript: call.transcript,
          transcript_url: null, // Not available in retell_calls
          user_id: call.user_id || '',
          company_id: call.company_id || '',
          call_type: 'phone_call',
          latency_ms: call.latency_ms,
          call_summary: call.call_summary,
          disposition: call.disposition,
          agent: call.agent
        };

        console.log('🔍 [AnalyticsPage] Transformed call:', {
          id: transformed.id,
          timestamp: transformed.timestamp,
          call_status: transformed.call_status,
          cost_usd: transformed.cost_usd
        });

        return transformed;
      });

      console.log(`✅ [AnalyticsPage] Successfully transformed ${transformedData.length} calls`);
      setFilteredData(transformedData);
    } else {
      console.log('⚠️ [AnalyticsPage] No retell calls data to transform');
      setFilteredData([]);
    }
  }, [retellCalls]);

  // Filter the data based on the date range
  useEffect(() => {
    if (!retellCalls || retellCalls.length === 0) {
      console.log('🔍 [AnalyticsPage] No data to filter');
      return;
    }
    
    const [start, end] = dateRange;
    console.log('🔍 [AnalyticsPage] Applying date filter:', { start, end });
    
    // If no date range is selected, use all data
    if (!start && !end) {
      console.log('🔍 [AnalyticsPage] No date filter applied');
      return;
    }
    
    // Filter based on date range
    const filtered = filteredData.filter(call => {
      const callDate = call.timestamp;
      if (start && end) {
        const isInRange = callDate >= start && callDate <= end;
        console.log('🔍 [AnalyticsPage] Date filter check:', {
          callDate: callDate.toISOString(),
          start: start.toISOString(),
          end: end.toISOString(),
          isInRange
        });
        return isInRange;
      }
      if (start) {
        return callDate >= start;
      }
      if (end) {
        return callDate <= end;
      }
      return true;
    });
    
    console.log(`🔍 [AnalyticsPage] Filtered ${filtered.length} calls from ${filteredData.length} total`);
    setFilteredData(filtered);
  }, [dateRange, retellCalls]);

  const hasRealData = !isLoading && filteredData.length > 0;

  console.log('🔍 [AnalyticsPage] Render state:', {
    hasRealData,
    showDemo,
    isLoading,
    filteredDataLength: filteredData.length,
    retellCallsLength: retellCalls?.length || 0
  });

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

        {/* Debug Information */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading analytics data: {error.message}
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Panel for Development */}
        {process.env.NODE_ENV === 'development' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Debug Info:</strong> Loading: {isLoading ? 'Yes' : 'No'}, 
              Raw Calls: {retellCalls?.length || 0}, 
              Filtered: {filteredData?.length || 0}, 
              Company: {company?.id || 'None'}, 
              Error: {error?.message || 'None'}
            </AlertDescription>
          </Alert>
        )}
        
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
            {!isLoading && filteredData.length === 0 && retellCalls.length === 0 && (
              <div className="mt-8">
                <EmptyStateMessage
                  title="No analytics data available yet"
                  description="Analytics will appear here once you have call data. Start by syncing your calls or making your first call."
                  actionLabel="Refresh Data"
                  onAction={refetch}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Show filtered empty state */}
            {!isLoading && filteredData.length === 0 && retellCalls.length > 0 && (
              <div className="mt-8">
                <EmptyStateMessage
                  title="No calls found for selected date range"
                  description={`Found ${retellCalls.length} total calls, but none match the current filter. Try adjusting your date range.`}
                  actionLabel="Clear Filters"
                  onAction={() => setDateRange([null, null])}
                  isLoading={isLoading}
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
