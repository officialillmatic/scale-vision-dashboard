
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallData } from '@/pages/AnalyticsPage';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';

interface RevenueAnalyticsProps {
  data: CallData[];
}

export function RevenueAnalytics({ data }: RevenueAnalyticsProps) {
  // Monthly revenue data
  const monthlyRevenue = React.useMemo(() => {
    if (!data.length) return [];
    
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const firstDate = startOfMonth(new Date(sortedData[0].timestamp));
    const lastDate = startOfMonth(new Date(sortedData[sortedData.length - 1].timestamp));
    
    const monthRange = eachMonthOfInterval({ start: firstDate, end: lastDate });
    
    return monthRange.map(month => {
      const monthData = data.filter(call => {
        const callMonth = startOfMonth(new Date(call.timestamp));
        return callMonth.getTime() === month.getTime();
      });
      
      return {
        month: format(month, 'MMM yyyy'),
        revenue: monthData.reduce((sum, call) => sum + (call.cost_usd || 0), 0),
        calls: monthData.length,
        avgRevenuePerCall: monthData.length > 0 ? 
          monthData.reduce((sum, call) => sum + (call.cost_usd || 0), 0) / monthData.length : 0
      };
    });
  }, [data]);

  // Agent revenue contribution
  const agentRevenue = React.useMemo(() => {
    const agentStats = data.reduce((acc, call) => {
      const agentName = call.agent?.name || 'Unknown';
      if (!acc[agentName]) {
        acc[agentName] = { name: agentName, revenue: 0, calls: 0, utilization: 0 };
      }
      acc[agentName].revenue += call.cost_usd || 0;
      acc[agentName].calls++;
      return acc;
    }, {} as Record<string, any>);

    const totalRevenue = Object.values(agentStats).reduce((sum: number, agent: any) => sum + agent.revenue, 0);
    const totalCalls = data.length;

    return Object.values(agentStats)
      .map((agent: any) => ({
        ...agent,
        revenueShare: totalRevenue > 0 ? (agent.revenue / totalRevenue) * 100 : 0,
        utilization: totalCalls > 0 ? (agent.calls / totalCalls) * 100 : 0,
        avgRevenuePerCall: agent.calls > 0 ? agent.revenue / agent.calls : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  // Cost breakdown by time periods
  const costBreakdown = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const periods = {
      today: { label: 'Today', start: today, cost: 0, calls: 0 },
      week: { label: 'This Week', start: thisWeek, cost: 0, calls: 0 },
      month: { label: 'This Month', start: thisMonth, cost: 0, calls: 0 },
      total: { label: 'All Time', start: new Date(0), cost: 0, calls: 0 }
    };

    data.forEach(call => {
      const callDate = new Date(call.timestamp);
      const cost = call.cost_usd || 0;

      Object.values(periods).forEach(period => {
        if (callDate >= period.start) {
          period.cost += cost;
          period.calls++;
        }
      });
    });

    return Object.values(periods);
  }, [data]);

  // Calculate key metrics
  const totalRevenue = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const avgRevenuePerCall = data.length > 0 ? totalRevenue / data.length : 0;
  const topPerformingAgent = agentRevenue[0];
  const revenueGrowth = monthlyRevenue.length > 1 ? 
    ((monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0) - (monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0)) / Math.max(1, monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 1) * 100 : 0;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="space-y-6">
      {/* Revenue Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Total Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-sm text-gray-600">All time</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>Avg per Call</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgRevenuePerCall)}</div>
            <p className="text-sm text-gray-600">Revenue per call</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Growth Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueGrowth > 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">Month over month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <PieChart className="h-4 w-4" />
              <span>Top Agent</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(topPerformingAgent?.revenue || 0)}</div>
            <p className="text-sm text-gray-600">{topPerformingAgent?.name || 'No data'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={agentRevenue.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, revenueShare }) => `${name}: ${revenueShare.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {agentRevenue.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {costBreakdown.map((period) => (
              <div key={period.label} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">{period.label}</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(period.cost)}</p>
                <p className="text-sm text-gray-500">{period.calls} calls</p>
                <p className="text-xs text-gray-400">
                  {period.calls > 0 ? formatCurrency(period.cost / period.calls) : '$0.00'} avg
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Revenue Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Agent</th>
                  <th className="text-center py-3 px-4">Total Revenue</th>
                  <th className="text-center py-3 px-4">Revenue Share</th>
                  <th className="text-center py-3 px-4">Calls</th>
                  <th className="text-center py-3 px-4">Avg per Call</th>
                  <th className="text-center py-3 px-4">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {agentRevenue.map((agent, index) => (
                  <tr key={agent.name} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{agent.name}</td>
                    <td className="text-center py-3 px-4 font-bold text-green-600">
                      {formatCurrency(agent.revenue)}
                    </td>
                    <td className="text-center py-3 px-4">
                      {agent.revenueShare.toFixed(1)}%
                    </td>
                    <td className="text-center py-3 px-4">{agent.calls}</td>
                    <td className="text-center py-3 px-4">
                      {formatCurrency(agent.avgRevenuePerCall)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, agent.utilization)}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm">{agent.utilization.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
