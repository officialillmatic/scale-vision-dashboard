
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallData } from '@/pages/AnalyticsPage';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Phone, TrendingUp, Clock, DollarSign, CheckCircle2, BarChart3 } from 'lucide-react';

interface MetricsDashboardProps {
  data: CallData[];
  previousData?: CallData[];
}

export function MetricsDashboard({ data, previousData = [] }: MetricsDashboardProps) {
  // Current period metrics
  const totalCalls = data.length;
  const successfulCalls = data.filter(call => call.call_status === 'completed').length;
  const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
  
  const totalDuration = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
  
  const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const costPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

  // Previous period metrics for comparison
  const prevTotalCalls = previousData.length;
  const prevSuccessfulCalls = previousData.filter(call => call.call_status === 'completed').length;
  const prevSuccessRate = prevTotalCalls > 0 ? (prevSuccessfulCalls / prevTotalCalls) * 100 : 0;
  
  const prevTotalDuration = previousData.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  const prevAvgDuration = prevTotalCalls > 0 ? prevTotalDuration / prevTotalCalls : 0;
  
  const prevTotalCost = previousData.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const prevCostPerCall = prevTotalCalls > 0 ? prevTotalCost / prevTotalCalls : 0;

  // Calculate percentage changes
  const callsChange = prevTotalCalls > 0 ? ((totalCalls - prevTotalCalls) / prevTotalCalls) * 100 : 0;
  const successRateChange = prevSuccessRate > 0 ? successRate - prevSuccessRate : 0;
  const durationChange = prevAvgDuration > 0 ? ((avgDuration - prevAvgDuration) / prevAvgDuration) * 100 : 0;
  const costChange = prevCostPerCall > 0 ? ((costPerCall - prevCostPerCall) / prevCostPerCall) * 100 : 0;

  const formatChange = (change: number, isPercentage = false) => {
    const sign = change > 0 ? '+' : '';
    const value = isPercentage ? change.toFixed(1) : change.toFixed(1);
    return `${sign}${value}${isPercentage ? 'pp' : '%'}`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Calls</CardTitle>
          <Phone className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{totalCalls.toLocaleString()}</div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={getChangeColor(callsChange)}>{formatChange(callsChange)}</span>
            <span className="text-gray-500">vs previous period</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{successRate.toFixed(1)}%</div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={getChangeColor(successRateChange)}>{formatChange(successRateChange, true)}</span>
            <span className="text-gray-500">vs previous period</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
          <Clock className="h-5 w-5 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{formatDuration(Math.round(avgDuration))}</div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={getChangeColor(durationChange)}>{formatChange(durationChange)}</span>
            <span className="text-gray-500">vs previous period</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Cost per Call</CardTitle>
          <DollarSign className="h-5 w-5 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(costPerCall)}</div>
          <div className="flex items-center space-x-2 text-sm">
            <span className={getChangeColor(-costChange)}>{formatChange(costChange)}</span>
            <span className="text-gray-500">vs previous period</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
