
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalls } from '@/hooks/useCalls';
import { useCurrentUserAgents } from '@/hooks/useCurrentUserAgents';
import { useUnifiedRevenueData } from '@/hooks/useUnifiedRevenueData';
import { Phone, Bot, User, Clock, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

export function UnifiedRecentActivityFeed() {
  const { calls } = useCalls();
  const { data: userAgents } = useCurrentUserAgents();
  const { revenueTransactions, retellCalls } = useUnifiedRevenueData();

  // Get recent calls (last 5 from legacy calls)
  const recentCalls = calls
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);

  // Get recent retell calls (last 5)
  const recentRetellCalls = (retellCalls || [])
    .sort((a, b) => new Date(b.start_timestamp).getTime() - new Date(a.start_timestamp).getTime())
    .slice(0, 3);

  // Get recent revenue transactions (last 3)
  const recentRevenue = revenueTransactions
    ?.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 2) || [];

  // Create activity items
  const activities = [
    // Legacy calls
    ...recentCalls.map(call => ({
      id: call.id,
      type: 'call',
      title: `Call to ${call.to || 'Unknown'}`,
      description: `${call.call_status} • ${Math.round((call.duration_sec || 0) / 60)}m`,
      timestamp: new Date(call.timestamp),
      icon: Phone,
      status: call.call_status === 'completed' ? 'success' : 'warning'
    })),
    // Retell calls
    ...recentRetellCalls.map(call => ({
      id: `retell-${call.id}`,
      type: 'retell_call',
      title: `AI Call to ${call.to_number || 'Unknown'}`,
      description: `${call.call_status} • ${Math.round(call.duration_sec / 60)}m • ${formatCurrency(call.revenue_amount)}`,
      timestamp: new Date(call.start_timestamp),
      icon: Bot,
      status: call.call_status === 'completed' ? 'success' : 'warning'
    })),
    // Revenue transactions
    ...recentRevenue.map(transaction => ({
      id: transaction.id,
      type: 'revenue',
      title: `Revenue: ${formatCurrency(transaction.revenue_amount)}`,
      description: `${Math.round(transaction.billing_duration_sec / 60)}m call`,
      timestamp: new Date(transaction.transaction_date),
      icon: DollarSign,
      status: 'success'
    })),
    // Agent assignments
    ...(userAgents || []).slice(0, 1).map(assignment => ({
      id: assignment.id,
      type: 'assignment',
      title: `Agent assigned: ${assignment.agent_details?.name || 'Unknown Agent'}`,
      description: assignment.is_primary ? 'Primary agent' : 'Secondary agent',
      timestamp: new Date(assignment.assigned_at || new Date()),
      icon: User,
      status: 'info'
    }))
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'call': return 'Call';
      case 'retell_call': return 'AI Call';
      case 'revenue': return 'Revenue';
      case 'assignment': return 'Agent';
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border">
                    <activity.icon className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500">{activity.description}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge variant="outline" className={getStatusColor(activity.status)}>
                    {getTypeLabel(activity.type)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
