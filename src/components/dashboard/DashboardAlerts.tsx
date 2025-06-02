
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalls } from '@/hooks/useCalls';
import { useUserBalance } from '@/hooks/useUserBalance';
import { AlertTriangle, CheckCircle, Info, Bell } from 'lucide-react';

export function DashboardAlerts() {
  const { calls } = useCalls();
  const { isLowBalance, balance } = useUserBalance();

  // Calculate recent performance
  const recentCalls = calls.filter(call => 
    new Date(call.timestamp) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
  );
  const recentSuccessRate = recentCalls.length > 0 
    ? (recentCalls.filter(call => call.call_status === 'completed').length / recentCalls.length) * 100 
    : 0;

  const alerts = [];

  // Balance alert
  if (isLowBalance) {
    alerts.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Low Balance Alert',
      description: `Your account balance is low. Current balance: $${balance?.balance || 0}`,
      action: 'Add funds to continue using the service'
    });
  }

  // Performance alerts
  if (recentSuccessRate < 60 && recentCalls.length > 5) {
    alerts.push({
      type: 'warning',
      icon: AlertTriangle,
      title: 'Low Success Rate',
      description: `Success rate has dropped to ${recentSuccessRate.toFixed(1)}% in the last 24 hours`,
      action: 'Review agent performance and call quality'
    });
  }

  // System status
  alerts.push({
    type: 'success',
    icon: CheckCircle,
    title: 'System Status',
    description: 'All systems operational',
    action: 'Platform running smoothly'
  });

  // Recent activity info
  if (recentCalls.length > 0) {
    alerts.push({
      type: 'info',
      icon: Info,
      title: 'Recent Activity',
      description: `${recentCalls.length} calls processed in the last 24 hours`,
      action: 'System actively processing communications'
    });
  }

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <Alert key={index} className={getAlertStyle(alert.type)}>
              <alert.icon className={`h-4 w-4 ${getIconColor(alert.type)}`} />
              <AlertDescription>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.action}</p>
                  </div>
                  <Badge variant="outline" className={`ml-4 ${
                    alert.type === 'warning' ? 'border-yellow-300 text-yellow-700' :
                    alert.type === 'success' ? 'border-green-300 text-green-700' :
                    'border-blue-300 text-blue-700'
                  }`}>
                    {alert.type}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
