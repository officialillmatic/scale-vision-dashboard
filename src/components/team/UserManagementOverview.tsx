
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX, Clock, TrendingUp, Building2, Shield, Activity } from 'lucide-react';

export function UserManagementOverview() {
  // Mock data - in real app, this would come from hooks/API
  const stats = [
    {
      title: 'Total Users',
      value: '248',
      change: '+12%',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Active Users',
      value: '231',
      change: '+5%',
      icon: UserCheck,
      color: 'green'
    },
    {
      title: 'Pending Users',
      value: '17',
      change: '+3',
      icon: Clock,
      color: 'yellow'
    },
    {
      title: 'Departments',
      value: '12',
      change: '+2',
      icon: Building2,
      color: 'purple'
    }
  ];

  const roleDistribution = [
    { role: 'Admin', count: 5, percentage: 2 },
    { role: 'Manager', count: 23, percentage: 9 },
    { role: 'User', count: 201, percentage: 81 },
    { role: 'Viewer', count: 19, percentage: 8 }
  ];

  const recentActivities = [
    { user: 'John Smith', action: 'Joined Marketing team', time: '2 hours ago' },
    { user: 'Sarah Jones', action: 'Role changed to Manager', time: '4 hours ago' },
    { user: 'Mike Chen', action: 'Completed onboarding', time: '6 hours ago' },
    { user: 'Lisa Wang', action: 'Last login', time: '1 day ago' }
  ];

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-${stat.color}-50`}>
                <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">
                <span className="text-green-600">{stat.change}</span> from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roleDistribution.map((role, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-blue-${(index + 1) * 100}`} />
                    <span className="font-medium">{role.role}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{role.count}</span>
                    <Badge variant="outline" className="text-xs">
                      {role.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">{activity.user}</p>
                    <p className="text-xs text-gray-600">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">94.2%</div>
              <div className="text-sm text-green-700">User Satisfaction</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">87%</div>
              <div className="text-sm text-blue-700">Onboarding Completion</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">3.2 days</div>
              <div className="text-sm text-purple-700">Avg. Onboarding Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
