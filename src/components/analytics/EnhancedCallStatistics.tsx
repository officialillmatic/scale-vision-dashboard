
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallData } from '@/pages/AnalyticsPage';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Phone, Clock, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface EnhancedCallStatisticsProps {
  data: CallData[];
}

export function EnhancedCallStatistics({ data }: EnhancedCallStatisticsProps) {
  // Calculate total calls
  const totalCalls = data.length;
  
  // Calculate total duration in seconds
  const totalDurationSec = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  
  // Calculate average duration
  const avgDurationSec = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls) : 0;
  
  // Calculate total cost
  const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  
  // Calculate successful calls (completed status)
  const successfulCalls = data.filter(call => call.call_status === 'completed').length;
  const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
  
  // Calculate average sentiment score
  const callsWithSentiment = data.filter(call => call.sentiment_score !== null);
  const avgSentiment = callsWithSentiment.length > 0 
    ? callsWithSentiment.reduce((sum, call) => sum + (call.sentiment_score || 0), 0) / callsWithSentiment.length
    : null;
  
  // Calculate average latency
  const callsWithLatency = data.filter(call => call.latency_ms && call.latency_ms > 0);
  const avgLatency = callsWithLatency.length > 0
    ? callsWithLatency.reduce((sum, call) => sum + (call.latency_ms || 0), 0) / callsWithLatency.length
    : null;
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">{successfulCalls} of {totalCalls} completed</p>
        </CardContent>
      </Card>
      
      {avgSentiment !== null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgSentiment >= 0.7 ? 'Positive' : avgSentiment >= 0.3 ? 'Neutral' : 'Negative'}
            </div>
            <p className="text-xs text-muted-foreground">{(avgSentiment * 100).toFixed(1)}% score</p>
          </CardContent>
        </Card>
      )}
      
      {avgLatency !== null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgLatency)}ms</div>
            <p className="text-xs text-muted-foreground">
              {avgLatency < 100 ? 'Excellent' : avgLatency < 300 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
