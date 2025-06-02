
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRevenueData } from '@/hooks/useRevenueData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

interface RevenueChartProps {
  startDate?: Date;
  endDate?: Date;
}

export function RevenueChart({ startDate, endDate }: RevenueChartProps) {
  const { revenueMetrics, isLoading } = useRevenueData(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = revenueMetrics?.revenue_by_day?.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    revenue: day.revenue,
    calls: day.calls
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                name === 'revenue' ? formatCurrency(value) : value,
                name === 'revenue' ? 'Revenue' : 'Calls'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#10B981" 
              strokeWidth={3} 
              name="Revenue"
            />
            <Line 
              type="monotone" 
              dataKey="calls" 
              stroke="#3B82F6" 
              strokeWidth={2} 
              name="Calls"
              yAxisId="right"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
