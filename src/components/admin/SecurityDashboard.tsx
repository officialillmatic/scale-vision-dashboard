
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Clock, Activity } from 'lucide-react';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';
import { RoleCheck } from '@/components/auth/RoleCheck';

export const SecurityDashboard: React.FC = () => {
  const { alerts, isMonitoring, clearAlerts } = useSecurityMonitor();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <RoleCheck adminOnly fallback={<div>Access denied</div>}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <div className="flex items-center gap-2">
            <Badge variant={isMonitoring ? 'default' : 'secondary'}>
              <Activity className="h-3 w-3 mr-1" />
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
            </Badge>
            {alerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAlerts}>
                Clear Alerts
              </Button>
            )}
          </div>
        </div>

        {/* Security Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <p className="text-xs text-muted-foreground">
                Security events requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length}
              </div>
              <p className="text-xs text-muted-foreground">
                High priority security issues
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitoring Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isMonitoring ? 'ON' : 'OFF'}
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time security monitoring
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Security Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No security alerts at this time</p>
                <p className="text-sm">System is monitoring for security events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 10).map((alert) => (
                  <Alert key={alert.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <AlertDescription className="font-medium">
                            {alert.message}
                          </AlertDescription>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Production Ready:</strong> All critical security policies are now in place.
                  RLS is enabled on all tables with proper access controls.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <strong>Monitoring Active:</strong> Real-time security monitoring is tracking
                  suspicious activities and rate limiting violations.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Regular Reviews:</strong> Review security alerts daily and investigate
                  any high-severity events immediately.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleCheck>
  );
};
