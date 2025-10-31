
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserMetrics } from '@/types/userManagement';
import { TrendingUp, TrendingDown, Phone, Clock, Target, Users } from 'lucide-react';

export function PerformanceTracker() {
  // Mock performance data
  const userMetrics: UserMetrics[] = [
    {
      user_id: 'user-1',
      total_calls: 156,
      total_duration_minutes: 890,
      average_call_duration: 5.7,
      success_rate: 94.2,
      last_activity_date: '2024-01-15',
      agents_assigned: 3,
      performance_score: 92
    },
    {
      user_id: 'user-2',
      total_calls: 89,
      total_duration_minutes: 445,
      average_call_duration: 5.0,
      success_rate: 87.6,
      last_activity_date: '2024-01-14',
      agents_assigned: 2,
      performance_score: 85
    },
    {
      user_id: 'user-3',
      total_calls: 234,
      total_duration_minutes: 1245,
      average_call_duration: 5.3,
      success_rate: 91.8,
      last_activity_date: '2024-01-15',
      agents_assigned: 4,
      performance_score: 89
    }
  ];

  const userNames: Record<string, string> = {
    'user-1': 'John Smith',
    'user-2': 'Sarah Jones',
    'user-3': 'Mike Chen'
  };

  const topPerformers = userMetrics
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 3);

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 80) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getPerformanceIcon = (score: number) => {
    return score >= 85 ? TrendingUp : TrendingDown;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Performance Tracking</h2>
        <p className="text-gray-600">Monitor individual and team performance metrics</p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Average Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(userMetrics.reduce((sum, m) => sum + m.performance_score, 0) / userMetrics.length)}
            </div>
            <p className="text-xs text-gray-500">Team average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userMetrics.reduce((sum, m) => sum + m.total_calls, 0)}
            </div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(userMetrics.reduce((sum, m) => sum + m.success_rate, 0) / userMetrics.length)}%
            </div>
            <p className="text-xs text-gray-500">Team average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics.length}</div>
            <p className="text-xs text-gray-500">With recent activity</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((user, index) => {
                const PerformanceIcon = getPerformanceIcon(user.performance_score);
                return (
                  <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {userNames[user.user_id]?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">{userNames[user.user_id] || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{user.total_calls} calls this month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getPerformanceColor(user.performance_score)}>
                        <PerformanceIcon className="h-3 w-3 mr-1" />
                        {user.performance_score}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Team Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userMetrics.map((user) => (
                <div key={user.user_id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{userNames[user.user_id] || 'Unknown'}</span>
                    <span className="text-sm text-gray-600">{user.performance_score}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${user.performance_score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{user.total_calls} calls</span>
                    <span>{user.success_rate.toFixed(1)}% success</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Calls</th>
                  <th className="text-left p-2">Duration</th>
                  <th className="text-left p-2">Avg. Call</th>
                  <th className="text-left p-2">Success Rate</th>
                  <th className="text-left p-2">Performance</th>
                </tr>
              </thead>
              <tbody>
                {userMetrics.map((user) => (
                  <tr key={user.user_id} className="border-b">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-xs">
                            {userNames[user.user_id]?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="font-medium">{userNames[user.user_id] || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-2">{user.total_calls}</td>
                    <td className="p-2">{Math.round(user.total_duration_minutes)}m</td>
                    <td className="p-2">{user.average_call_duration.toFixed(1)}m</td>
                    <td className="p-2">{user.success_rate.toFixed(1)}%</td>
                    <td className="p-2">
                      <Badge variant="outline" className={getPerformanceColor(user.performance_score)}>
                        {user.performance_score}
                      </Badge>
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
