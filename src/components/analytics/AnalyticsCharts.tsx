
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallData } from '@/types/analytics';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfDay, eachDayOfInterval, parseISO } from 'date-fns';

interface AnalyticsChartsProps {
  data: CallData[];
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Calls over time data
  const callsOverTime = useMemo(() => {
    if (!data.length) return [];
    
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const firstDate = startOfDay(new Date(sortedData[0].timestamp));
    const lastDate = startOfDay(new Date(sortedData[sortedData.length - 1].timestamp));
    
    const dateRange = eachDayOfInterval({ start: firstDate, end: lastDate });
    
    return dateRange.map(date => {
      const dayData = data.filter(call => {
        const callDate = startOfDay(new Date(call.timestamp));
        return callDate.getTime() === date.getTime();
      });
      
      return {
        date: format(date, 'MMM dd'),
        calls: dayData.length,
        successful: dayData.filter(call => call.call_status === 'completed').length,
        cost: dayData.reduce((sum, call) => sum + (call.cost_usd || 0), 0)
      };
    });
  }, [data]);

  // Agent performance data
  const agentPerformance = useMemo(() => {
    const agentStats = data.reduce((acc, call) => {
      const agentName = call.agent?.name || 'Unknown';
      if (!acc[agentName]) {
        acc[agentName] = { name: agentName, calls: 0, successful: 0, totalCost: 0, totalDuration: 0 };
      }
      acc[agentName].calls++;
      if (call.call_status === 'completed') acc[agentName].successful++;
      acc[agentName].totalCost += call.cost_usd || 0;
      acc[agentName].totalDuration += call.duration_sec || 0;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(agentStats).map((agent: any) => ({
      ...agent,
      successRate: agent.calls > 0 ? (agent.successful / agent.calls) * 100 : 0,
      avgDuration: agent.calls > 0 ? agent.totalDuration / agent.calls : 0
    }));
  }, [data]);

  // Call outcomes data
  const callOutcomes = useMemo(() => {
    const outcomes = data.reduce((acc, call) => {
      const status = call.call_status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      completed: '#10B981',
      failed: '#EF4444',
      user_hangup: '#F59E0B',
      dial_no_answer: '#6B7280',
      voicemail: '#8B5CF6',
      other: '#94A3B8'
    };

    return Object.entries(outcomes).map(([status, count]) => ({
      name: status.replace('_', ' ').toUpperCase(),
      value: count,
      color: colors[status as keyof typeof colors] || colors.other
    }));
  }, [data]);

  // Peak hours data
  const peakHours = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      calls: 0,
      successful: 0
    }));

    data.forEach(call => {
      const hour = new Date(call.timestamp).getHours();
      hourlyData[hour].calls++;
      if (call.call_status === 'completed') {
        hourlyData[hour].successful++;
      }
    });

    return hourlyData.filter(item => item.calls > 0);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Calls Over Time */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Call Volume Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={callsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} name="Total Calls" />
                <Line type="monotone" dataKey="successful" stroke="#10B981" strokeWidth={2} name="Successful" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Call Outcomes */}
        <Card>
          <CardHeader>
            <CardTitle>Call Outcomes Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={callOutcomes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {callOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance and Peak Hours */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerformance.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="calls" fill="#3B82F6" name="Total Calls" />
                <Bar dataKey="successful" fill="#10B981" name="Successful" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="calls" fill="#8B5CF6" name="Total Calls" />
                <Bar dataKey="successful" fill="#10B981" name="Successful" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
