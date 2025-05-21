
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CallData } from '@/pages/AnalyticsPage';
import { addDays, format, isEqual, isWithinInterval, parseISO, startOfDay } from 'date-fns';

interface CallChartProps {
  data: CallData[];
}

export function CallChart({ data }: CallChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Get date range
    const firstDate = startOfDay(new Date(sortedData[0].timestamp));
    const lastDate = startOfDay(new Date(sortedData[sortedData.length - 1].timestamp));
    
    // Create an array of dates between the first and last date
    const dateRange: Date[] = [];
    let currentDate = firstDate;
    
    while (currentDate <= lastDate) {
      dateRange.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    // Count calls for each date
    return dateRange.map(date => {
      const callsOnDay = sortedData.filter(call => {
        const callDate = startOfDay(new Date(call.timestamp));
        return isEqual(callDate, date);
      });
      
      return {
        date: format(date, 'MMM dd'),
        calls: callsOnDay.length,
        cost: callsOnDay.reduce((sum, call) => sum + (call.cost_usd || 0), 0)
      };
    });
  }, [data]);
  
  if (chartData.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date"
              tickLine={false}
              axisLine={false}
              stroke="#888888"
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              stroke="#888888"
              fontSize={12}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip />
            <Bar 
              dataKey="calls" 
              name="Calls" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
