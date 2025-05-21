
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Download } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CallData } from '@/services/callService';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const AnalyticsPage = () => {
  const { toast } = useToast();
  const { company } = useAuth();
  
  const handleTabChange = (value: string) => {
    toast({
      title: "Tab Changed",
      description: `Viewing ${value} analytics data`,
    });
  };
  
  const handleGenerateReport = () => {
    toast({
      title: "Report Generation",
      description: "Analytics report is being generated. You will be notified when it's ready.",
    });
  };

  // Fetch real call data for analytics
  const { data: calls, isLoading: isLoadingCalls } = useQuery({
    queryKey: ['analytics-calls', company?.id],
    queryFn: async (): Promise<CallData[]> => {
      if (!company?.id) return [];
      
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
          console.error("Error fetching analytics calls:", error);
          return [];
        }
        
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
          user_id: call.user_id,
          result_sentiment: call.result_sentiment,
          company_id: call.company_id,
          call_type: call.call_type || 'phone_call',
          latency_ms: call.latency_ms || 0,
          call_summary: call.call_summary,
          agent: call.agent
        }));
      } catch (error) {
        console.error("Error in analytics calls query:", error);
        return [];
      }
    },
    enabled: !!company?.id
  });

  // Calculate real analytics metrics
  const totalCalls = calls?.length || 0;
  const totalMinutes = Math.round(calls?.reduce((sum, call) => sum + call.duration_sec / 60, 0) || 0);
  const avgCallTime = totalCalls > 0 ? 
    Math.round(calls!.reduce((sum, call) => sum + call.duration_sec, 0) / totalCalls) : 0;
  const totalCost = calls?.reduce((sum, call) => sum + (call.cost_usd || 0), 0) || 0;
  
  // Calculate sentiment score (0-100 scale)
  const sentimentScore = (() => {
    if (!calls || calls.length === 0) return 0;
    
    const sentimentMap = {
      'positive': 100,
      'neutral': 50,
      'negative': 0
    };
    
    const callsWithSentiment = calls.filter(call => call.sentiment);
    if (callsWithSentiment.length === 0) return 0;
    
    const totalScore = callsWithSentiment.reduce((sum, call) => {
      return sum + (sentimentMap[call.sentiment as keyof typeof sentimentMap] || 50);
    }, 0);
    
    return Math.round(totalScore / callsWithSentiment.length);
  })();
  
  // Calculate conversion rate (using completed calls as a proxy)
  const completedCalls = calls?.filter(call => call.call_status === 'completed').length || 0;
  const conversionRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
  
  // Calculate period change percentages
  const calculatePeriodChange = () => {
    if (!calls || calls.length === 0) return { calls: "0%", time: "0%", sentiment: "0%", conversion: "0%" };
    
    const now = new Date();
    const oneMonthAgo = subDays(now, 30);
    const twoMonthsAgo = subDays(now, 60);
    
    const currentPeriodCalls = calls.filter(call => call.timestamp >= oneMonthAgo);
    const previousPeriodCalls = calls.filter(call => 
      call.timestamp >= twoMonthsAgo && call.timestamp < oneMonthAgo
    );
    
    const formatChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
    };
    
    return {
      calls: formatChange(currentPeriodCalls.length, previousPeriodCalls.length),
      time: formatChange(
        currentPeriodCalls.reduce((sum, call) => sum + call.duration_sec, 0),
        previousPeriodCalls.reduce((sum, call) => sum + call.duration_sec, 0)
      ),
      sentiment: "N/A", // Would need historical sentiment data
      conversion: "N/A"  // Would need historical conversion data
    };
  };
  
  const periodChanges = calculatePeriodChange();
  
  // Format the average call time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <div className="h-full">
        <div className="flex flex-col space-y-8 pb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground">
                Monitor and analyze your call data with powerful insights.
              </p>
            </div>
            
            <Button onClick={handleGenerateReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
          
          <Tabs defaultValue="overview" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Call Trends</TabsTrigger>
              <TabsTrigger value="performance">Agent Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoadingCalls ? (
                  Array(4).fill(0).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalCalls}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className={periodChanges.calls.startsWith('+') ? "text-green-500" : "text-red-500"}>
                            {periodChanges.calls}
                          </span> from last month
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Call Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatTime(avgCallTime)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className={periodChanges.time.startsWith('+') ? "text-green-500" : "text-red-500"}>
                            {periodChanges.time}
                          </span> from last month
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{sentimentScore}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {periodChanges.sentiment !== "N/A" ? (
                            <span className={periodChanges.sentiment.startsWith('+') ? "text-green-500" : "text-red-500"}>
                              {periodChanges.sentiment}
                            </span>
                          ) : (
                            <span className="text-gray-500">Insufficient data</span>
                          )} from last month
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{conversionRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {periodChanges.conversion !== "N/A" ? (
                            <span className={periodChanges.conversion.startsWith('+') ? "text-green-500" : "text-red-500"}>
                              {periodChanges.conversion}
                            </span>
                          ) : (
                            <span className="text-gray-500">Insufficient data</span>
                          )} from last month
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Call Summary</CardTitle>
                  <CardDescription>
                    Call analytics breakdown by month
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  {isLoadingCalls ? (
                    <LoadingSpinner size="lg" />
                  ) : totalCalls > 0 ? (
                    <div className="text-center p-8">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto mb-6 text-muted-foreground">
                        <path d="M3 3v18h18" />
                        <path d="m19 9-5 5-4-4-3 3" />
                      </svg>
                      <h3 className="text-lg font-medium mb-2">Call summary for {format(new Date(), "MMMM yyyy")}</h3>
                      <ul className="text-muted-foreground text-left mx-auto max-w-sm space-y-2">
                        <li>• Total call duration: {formatTime(calls!.reduce((sum, call) => sum + call.duration_sec, 0))}</li>
                        <li>• Total cost: ${totalCost.toFixed(2)}</li>
                        <li>• Successful calls: {completedCalls}</li>
                        <li>• Average call duration: {formatTime(avgCallTime)}</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto mb-6 text-muted-foreground">
                        <path d="M3 3v18h18" />
                        <path d="m19 9-5 5-4-4-3 3" />
                      </svg>
                      <h3 className="text-lg font-medium mb-2">No call data available</h3>
                      <p className="text-muted-foreground">
                        Try syncing your call history or wait for new activity.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Call Volume Trends</CardTitle>
                  <CardDescription>
                    Call volume analysis by day and time
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center">
                  {isLoadingCalls ? (
                    <LoadingSpinner size="lg" />
                  ) : totalCalls > 0 ? (
                    <div className="text-center p-8 w-full">
                      <h3 className="text-lg font-medium mb-4">Call Volume by Day</h3>
                      <div className="grid grid-cols-7 gap-2 w-full max-w-lg mx-auto">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                          // Count calls for each day of the week
                          const dayOfWeekCalls = calls!.filter(call => call.timestamp.getDay() === (i + 1) % 7).length;
                          const maxHeight = 150;
                          const height = totalCalls > 0 
                            ? Math.max(30, (dayOfWeekCalls / Math.max(...calls!.map(c => c.timestamp.getDay()).filter(d => d !== undefined)
                                .reduce((acc, day) => {
                                  acc[day] = (acc[day] || 0) + 1;
                                  return acc;
                                }, {} as Record<number, number>)[Object.keys(calls!.map(c => c.timestamp.getDay())
                                  .filter(d => d !== undefined)
                                  .reduce((acc, day) => {
                                    acc[day] = (acc[day] || 0) + 1;
                                    return acc;
                                  }, {} as Record<number, number>))[0] || 1])) * maxHeight) 
                            : 30;

                          return (
                            <div key={day} className="flex flex-col items-center">
                              <div className="text-xs text-muted-foreground mb-1">{dayOfWeekCalls}</div>
                              <div 
                                className="w-8 bg-primary/80 rounded-t-sm" 
                                style={{ height: `${height}px` }}
                              ></div>
                              <div className="text-xs mt-1">{day}</div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-sm text-muted-foreground mt-8">
                        Based on {totalCalls} calls over the past 30 days
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto mb-6 text-muted-foreground">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" x2="7" y1="2" y2="22"></line>
                        <line x1="17" x2="17" y1="2" y2="22"></line>
                        <line x1="2" x2="22" y1="12" y2="12"></line>
                        <line x1="2" x2="7" y1="7" y2="7"></line>
                        <line x1="2" x2="7" y1="17" y2="17"></line>
                        <line x1="17" x2="22" y1="17" y2="17"></line>
                        <line x1="17" x2="22" y1="7" y2="7"></line>
                      </svg>
                      <h3 className="text-lg font-medium mb-2">No trend data available</h3>
                      <p className="text-muted-foreground">
                        Try syncing your call history or wait for new activity.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                  <CardDescription>
                    Comparison of agent performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center">
                  {isLoadingCalls ? (
                    <LoadingSpinner size="lg" />
                  ) : totalCalls > 0 ? (
                    <div className="text-center p-8">
                      <h3 className="text-lg font-medium mb-4">Agent Performance Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <Card>
                          <CardHeader className="py-2">
                            <CardTitle className="text-sm">Call Duration</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-xl font-semibold">{formatTime(avgCallTime)}</p>
                            <p className="text-xs text-muted-foreground">Average call time</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="py-2">
                            <CardTitle className="text-sm">Completion Rate</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-xl font-semibold">{conversionRate}%</p>
                            <p className="text-xs text-muted-foreground">Calls completed successfully</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="py-2">
                            <CardTitle className="text-sm">Sentiment Score</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-xl font-semibold">{sentimentScore}%</p>
                            <p className="text-xs text-muted-foreground">Average customer sentiment</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="py-2">
                            <CardTitle className="text-sm">Total Calls</CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-xl font-semibold">{totalCalls}</p>
                            <p className="text-xs text-muted-foreground">Calls in the last 30 days</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto mb-6 text-muted-foreground">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M22 21v-2a4 4 0 0 1 0 7.75"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <h3 className="text-lg font-medium mb-2">No agent data available</h3>
                      <p className="text-muted-foreground">
                        Try syncing your call history or wait for new activity.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
