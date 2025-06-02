
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CallData } from '@/pages/AnalyticsPage';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Users, Phone, Clock, TrendingUp } from 'lucide-react';

interface UserAnalyticsProps {
  data: CallData[];
}

export function UserAnalytics({ data }: UserAnalyticsProps) {
  const userMetrics = React.useMemo(() => {
    const userStats = data.reduce((acc, call) => {
      const userId = call.user_id;
      
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          totalCalls: 0,
          successfulCalls: 0,
          totalDuration: 0,
          totalCost: 0,
          firstCallDate: null as Date | null,
          lastCallDate: null as Date | null,
          avgCallsPerDay: 0,
          peakHour: null as number | null,
          hourlyDistribution: Array(24).fill(0)
        };
      }

      const user = acc[userId];
      user.totalCalls++;
      user.totalDuration += call.duration_sec || 0;
      user.totalCost += call.cost_usd || 0;

      if (call.call_status === 'completed') {
        user.successfulCalls++;
      }

      const callDate = new Date(call.timestamp);
      const callHour = callDate.getHours();
      user.hourlyDistribution[callHour]++;

      if (!user.firstCallDate || callDate < user.firstCallDate) {
        user.firstCallDate = callDate;
      }

      if (!user.lastCallDate || callDate > user.lastCallDate) {
        user.lastCallDate = callDate;
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(userStats)
      .map((user: any) => {
        // Calculate days since first call
        const daysSinceFirst = user.firstCallDate ? 
          Math.max(1, Math.ceil((Date.now() - user.firstCallDate.getTime()) / (1000 * 60 * 60 * 24))) : 1;
        
        // Find peak hour
        const maxHourIndex = user.hourlyDistribution.indexOf(Math.max(...user.hourlyDistribution));
        
        return {
          ...user,
          successRate: user.totalCalls > 0 ? (user.successfulCalls / user.totalCalls) * 100 : 0,
          avgDuration: user.totalCalls > 0 ? user.totalDuration / user.totalCalls : 0,
          avgCostPerCall: user.totalCalls > 0 ? user.totalCost / user.totalCalls : 0,
          avgCallsPerDay: user.totalCalls / daysSinceFirst,
          peakHour: maxHourIndex,
          daysSinceFirst,
          engagementScore: Math.min(100, (user.totalCalls / daysSinceFirst) * 10)
        };
      })
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }, [data]);

  const topUsers = userMetrics.slice(0, 3);
  const totalUsers = userMetrics.length;
  const avgCallsPerUser = totalUsers > 0 ? data.length / totalUsers : 0;
  const activeUsers = userMetrics.filter(user => 
    user.lastCallDate && (Date.now() - user.lastCallDate.getTime()) < (7 * 24 * 60 * 60 * 1000)
  ).length;

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getActivityColor = (daysAgo: number) => {
    if (daysAgo <= 1) return 'bg-green-100 text-green-800';
    if (daysAgo <= 7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* User Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Total Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-sm text-gray-600">Unique callers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Active Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-sm text-gray-600">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4" />
              <span>Avg Calls/User</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCallsPerUser.toFixed(1)}</div>
            <p className="text-sm text-gray-600">Per user</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>Avg Session</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(Math.round(userMetrics.reduce((sum, user) => sum + user.avgDuration, 0) / Math.max(1, userMetrics.length)))}
            </div>
            <p className="text-sm text-gray-600">Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <div className="grid gap-4 md:grid-cols-3">
        {topUsers.map((user, index) => (
          <Card key={user.userId} className={`border-l-4 ${
            index === 0 ? 'border-l-gold' : 
            index === 1 ? 'border-l-silver' : 
            'border-l-bronze'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span>User #{index + 1}</span>
                <Badge variant="outline">
                  Top Caller
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Total Calls</p>
                  <p className="font-semibold text-lg">{user.totalCalls}</p>
                </div>
                <div>
                  <p className="text-gray-600">Success Rate</p>
                  <p className="font-semibold text-lg">{user.successRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Calls/Day</p>
                  <p className="font-semibold">{user.avgCallsPerDay.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Peak Hour</p>
                  <p className="font-semibold">{user.peakHour}:00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed User Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>User Engagement Analysis</span>
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
                  <TableHead className="text-center">Total Spent</TableHead>
                  <TableHead className="text-center">Calls/Day</TableHead>
                  <TableHead className="text-center">Peak Hour</TableHead>
                  <TableHead className="text-center">Engagement</TableHead>
                  <TableHead className="text-center">Last Call</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userMetrics.slice(0, 20).map((user) => {
                  const daysAgo = user.lastCallDate ? 
                    Math.floor((Date.now() - user.lastCallDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                  
                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="font-mono text-sm">
                        {user.userId.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {user.totalCalls}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.successRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDuration(Math.round(user.avgDuration))}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(user.totalCost)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.avgCallsPerDay.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.peakHour !== null ? `${user.peakHour}:00` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getEngagementColor(user.engagementScore)}>
                          {user.engagementScore.toFixed(0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getActivityColor(daysAgo)}>
                          {daysAgo === 0 ? 'Today' : 
                           daysAgo === 1 ? 'Yesterday' : 
                           daysAgo < 7 ? `${daysAgo}d ago` : 
                           daysAgo < 30 ? `${Math.floor(daysAgo / 7)}w ago` : 
                           '30d+ ago'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
