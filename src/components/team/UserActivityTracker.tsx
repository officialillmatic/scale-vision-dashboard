
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserActivity } from '@/types/userManagement';
import { Activity, Search, Filter, Clock, Phone, UserCheck, Settings } from 'lucide-react';

export function UserActivityTracker() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock activity data
  const activities: UserActivity[] = [
    {
      id: '1',
      user_id: 'user-1',
      activity_type: 'login',
      description: 'User logged in from Chrome on Windows',
      metadata: { browser: 'Chrome', os: 'Windows', ip: '192.168.1.1' },
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      user_id: 'user-2',
      activity_type: 'call_made',
      description: 'Made call to +1-555-0123 (duration: 5m 23s)',
      metadata: { phone: '+1-555-0123', duration: 323, agent_id: 'agent-1' },
      created_at: '2024-01-15T09:15:00Z'
    },
    {
      id: '3',
      user_id: 'user-3',
      activity_type: 'agent_assigned',
      description: 'Agent "Sales Bot" assigned as primary',
      metadata: { agent_id: 'agent-2', agent_name: 'Sales Bot', is_primary: true },
      created_at: '2024-01-15T08:45:00Z'
    },
    {
      id: '4',
      user_id: 'user-1',
      activity_type: 'role_changed',
      description: 'Role changed from User to Manager',
      metadata: { old_role: 'user', new_role: 'manager', changed_by: 'admin-1' },
      created_at: '2024-01-14T16:20:00Z'
    }
  ];

  const getActivityIcon = (type: UserActivity['activity_type']) => {
    const icons = {
      login: Clock,
      call_made: Phone,
      agent_assigned: UserCheck,
      role_changed: Settings,
      department_changed: Settings
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (type: UserActivity['activity_type']) => {
    const colors = {
      login: 'bg-blue-50 text-blue-700 border-blue-200',
      call_made: 'bg-green-50 text-green-700 border-green-200',
      agent_assigned: 'bg-purple-50 text-purple-700 border-purple-200',
      role_changed: 'bg-orange-50 text-orange-700 border-orange-200',
      department_changed: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    };
    return colors[type] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const filteredActivities = activities.filter(activity =>
    activity.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mock user names mapping
  const userNames: Record<string, string> = {
    'user-1': 'John Smith',
    'user-2': 'Sarah Jones',
    'user-3': 'Mike Chen'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Activity Tracking</h2>
          <p className="text-gray-600">Monitor user activities and system interactions</p>
        </div>
      </div>

      {/* Activity Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-gray-500">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">User Logins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(a => a.activity_type === 'login').length}
            </div>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Calls Made</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(a => a.activity_type === 'call_made').length}
            </div>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">System Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.filter(a => a.activity_type === 'role_changed' || a.activity_type === 'agent_assigned').length}
            </div>
            <p className="text-xs text-gray-500">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.activity_type);
                return (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-xs">
                            {userNames[activity.user_id]?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="font-medium text-sm">
                          {userNames[activity.user_id] || 'Unknown User'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getActivityColor(activity.activity_type)}>
                        <ActivityIcon className="h-3 w-3 mr-1" />
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{activity.description}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
