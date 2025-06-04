
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CallData } from '@/types/analytics';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { User, Phone, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface UserAnalyticsProps {
  data: CallData[];
}

export function UserAnalytics({ data }: UserAnalyticsProps) {
  const userMetrics = React.useMemo(() => {
    const userStats = data.reduce((acc, call) => {
      const userId = call.user_id || 'unknown';
      
      if (!acc[userId]) {
        acc[userId] = {
          id: userId,
          totalCalls: 0,
          totalDuration: 0,
          totalCost: 0,
          successfulCalls: 0,
          lastCallDate: null as Date | null
        };
      }

      const user = acc[userId];
      user.totalCalls++;
      user.totalDuration += call.duration_sec || 0;
      user.totalCost += call.cost_usd || 0;

      if (call.call_status === 'completed') {
        user.successfulCalls++;
      }

      if (!user.lastCallDate || new Date(call.timestamp) > user.lastCallDate) {
        user.lastCallDate = new Date(call.timestamp);
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(userStats)
      .map((user: any) => ({
        ...user,
        successRate: user.totalCalls > 0 ? (user.successfulCalls / user.totalCalls) * 100 : 0,
        avgDuration: user.totalCalls > 0 ? user.totalDuration / user.totalCalls : 0,
        avgCostPerCall: user.totalCalls > 0 ? user.totalCost / user.totalCalls : 0
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }, [data]);

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800';
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const totalUsers = userMetrics.length;
  const totalCalls = userMetrics.reduce((sum, user) => sum + user.totalCalls, 0);
  const avgCallsPerUser = totalUsers > 0 ? totalCalls / totalUsers : 0;

  return (
    <div className="space-y-6">
      {/* User Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Calls per User</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCallsPerUser.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">calls per user</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userMetrics[0]?.totalCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground">calls by top user</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(userMetrics.reduce((sum, user) => sum + user.totalCost, 0))}
            </div>
            <p className="text-xs text-muted-foreground">across all users</p>
          </CardContent>
        </Card>
      </div>

      {/* User Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Performance Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead className="text-center">Total Calls</TableHead>
                  <TableHead className="text-center">Success Rate</TableHead>
                  <TableHead className="text-center">Avg Duration</TableHead>
                  <TableHead className="text-center">Total Cost</TableHead>
                  <TableHead className="text-center">Avg Cost per Call</TableHead>
                  <TableHead className="text-center">Last Call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userMetrics.slice(0, 20).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-blue-500" />
                        <span className="font-mono text-sm">
                          {user.id === 'unknown' ? 'Unknown' : user.id.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {user.totalCalls}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getPerformanceColor(user.successRate)}>
                        {user.successRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDuration(Math.round(user.avgDuration))}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatCurrency(user.totalCost)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(user.avgCostPerCall)}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.lastCallDate ? 
                        new Date(user.lastCallDate).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
