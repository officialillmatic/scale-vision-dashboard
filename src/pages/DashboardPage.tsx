
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EnvWarning } from '@/components/common/EnvWarning';
import { CallStats } from '@/components/calls/CallStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardPage() {
  const { company } = useAuth();

  return (
    <DashboardLayout>
      <EnvWarning />
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to {company?.name || 'EchoWave'}! Monitor your call analytics and agent performance.
          </p>
        </div>
        
        <CallStats />
        
        <Tabs defaultValue="recent">
          <TabsList>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
            <TabsTrigger value="trends">Call Trends</TabsTrigger>
            <TabsTrigger value="performance">Agent Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Use the "Sync Calls" button on the Calls page to fetch your latest calls.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View call volume and trends over time as you collect more data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Compare agent performance metrics based on call outcomes and customer sentiment.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
