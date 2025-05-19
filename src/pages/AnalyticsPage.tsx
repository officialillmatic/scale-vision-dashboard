
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const AnalyticsPage = () => {
  const { toast } = useToast();
  
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
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-4 w-4 mr-2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
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
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">324</div>
                    <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Call Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">4:32</div>
                    <p className="text-xs text-muted-foreground mt-1">-0:45 from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">78%</div>
                    <p className="text-xs text-muted-foreground mt-1">+5% from last month</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">23.5%</div>
                    <p className="text-xs text-muted-foreground mt-1">+2% from last month</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Call Summary</CardTitle>
                  <CardDescription>
                    Call analytics breakdown by month
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto mb-6 text-muted-foreground">
                      <path d="M3 3v18h18" />
                      <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">Advanced Analytics Coming Soon</h3>
                    <p className="text-muted-foreground">
                      We're working on implementing detailed charts and analytics. 
                      Stay tuned for the upcoming update.
                    </p>
                  </div>
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
                    <h3 className="text-lg font-medium mb-2">Trend Analysis Coming Soon</h3>
                    <p className="text-muted-foreground">
                      We're building powerful trend analysis tools to help you understand call patterns.
                    </p>
                  </div>
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
                  <div className="text-center p-8">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 mx-auto mb-6 text-muted-foreground">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3 className="text-lg font-medium mb-2">Agent Analytics Coming Soon</h3>
                    <p className="text-muted-foreground">
                      We're developing tools to help you track and improve agent performance.
                    </p>
                  </div>
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
