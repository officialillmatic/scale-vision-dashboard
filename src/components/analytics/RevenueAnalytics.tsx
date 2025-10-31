
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CallData } from '@/types/analytics';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { DollarSign, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

interface RevenueAnalyticsProps {
  data: CallData[];
}

export function RevenueAnalytics({ data }: RevenueAnalyticsProps) {
  const revenueMetrics = React.useMemo(() => {
    const totalRevenue = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
    const totalCalls = data.length;
    const avgRevenuePerCall = totalCalls > 0 ? totalRevenue / totalCalls : 0;
    
    // Group by month for trend analysis
    const monthlyRevenue = data.reduce((acc, call) => {
      const month = new Date(call.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!acc[month]) {
        acc[month] = { revenue: 0, calls: 0 };
      }
      acc[month].revenue += call.cost_usd || 0;
      acc[month].calls += 1;
      return acc;
    }, {} as Record<string, { revenue: number; calls: number }>);

    return {
      totalRevenue,
      totalCalls,
      avgRevenuePerCall,
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, data]) => ({
        month,
        ...data
      }))
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueMetrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">from {revenueMetrics.totalCalls} calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue per Call</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueMetrics.avgRevenuePerCall)}</div>
            <p className="text-xs text-muted-foreground">per completed call</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueMetrics.monthlyRevenue.length > 1 ? '+' : ''}
              {revenueMetrics.monthlyRevenue.length > 0 ? 
                formatCurrency(revenueMetrics.monthlyRevenue[revenueMetrics.monthlyRevenue.length - 1]?.revenue || 0) : 
                '$0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Monthly Revenue Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg per Call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueMetrics.monthlyRevenue.map((month) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell className="text-right">{month.calls}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.revenue)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(month.calls > 0 ? month.revenue / month.calls : 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
