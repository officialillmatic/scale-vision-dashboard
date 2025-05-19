
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AnalyticsPage = () => {
  return (
    <DashboardLayout>
      <div className="h-full">
        <div className="flex flex-col space-y-8 pb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Call analytics and insights will be available here soon.
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Advanced analytics features are under development and will be available in a future update.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-20 w-20 mb-8 text-muted-foreground">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              <p className="text-center text-muted-foreground mb-4">
                Call analytics features, including sentiment analysis, call frequency, duration trends, 
                and conversion metrics are currently in development.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
