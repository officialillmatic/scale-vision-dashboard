
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallData } from '@/pages/AnalyticsPage';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Clock, DollarSign, Phone } from 'lucide-react';

interface CallStatisticsProps {
  data: CallData[];
}

export function CallStatistics({ data }: CallStatisticsProps) {
  // Calculate total calls
  const totalCalls = data.length;
  
  // Calculate total duration in seconds
  const totalDurationSec = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  
  // Calculate average duration
  const avgDurationSec = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls) : 0;
  
  // Calculate total cost
  const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCalls}</div>
          <p className="text-xs text-muted-foreground">calls in period</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatDuration(avgDurationSec)}</div>
          <p className="text-xs text-muted-foreground">per call</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
          <p className="text-xs text-muted-foreground">spent in period</p>
        </CardContent>
      </Card>
    </>
  );
}
