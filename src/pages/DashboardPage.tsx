import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EnvWarning } from '@/components/common/EnvWarning';
import { CallStats } from '@/components/calls/CallStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchCalls } from '@/services/callService';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';

export function DashboardPage() {
  const { company, isLoading: isLoadingAuth } = useAuth();

  const { 
    data: recentCalls, 
    isLoading: isLoadingCalls 
  } = useQuery({
    queryKey: ['recent-calls', company?.id],
    queryFn: () => {
      if (!company?.id) return Promise.resolve([]);
      return fetchCalls(company.id);
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const isLoading = isLoadingAuth || isLoadingCalls;
  const callCount = recentCalls?.length || 0;
  const lastWeekDate = subDays(new Date(), 7);
  const callsThisWeek = recentCalls?.filter(call => new Date(call.timestamp) >= lastWeekDate).length || 0;

  return (
    <DashboardLayout isLoading={isLoading}>
      <EnvWarning />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to {company?.name || 'EchoWave'}! Monitor your call analytics and agent performance.
          </p>
        </div>
        
        <CallStats />
        
        <Tabs defaultValue="recent" className="animate-fade-in">
          <TabsList>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
            <TabsTrigger value="trends">Call Trends</TabsTrigger>
            <TabsTrigger value="performance">Agent Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Recent Calls</span>
                  {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <span className="text-sm bg-brand-light-green text-brand-green px-3 py-1 rounded-full">
                      {callCount > 0 ? `${callCount} calls` : 'No calls yet'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                ) : callCount > 0 ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      You've had {callsThisWeek} calls in the last 7 days.
                    </p>
                    <p className="text-sm">
                      Last call on {format(new Date(recentCalls![0].timestamp), 'PP')}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Use the "Sync Calls" button on the Calls page to fetch your latest calls.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    View call volume and trends over time as you collect more data.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Compare agent performance metrics based on call outcomes and customer sentiment.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
