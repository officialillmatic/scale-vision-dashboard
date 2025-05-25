
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RoleCheck } from "@/components/auth/RoleCheck";
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface SystemCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  last_checked: string;
}

export function SystemHealth() {
  const { data: healthChecks, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<SystemCheck[]> => {
      const checks: SystemCheck[] = [];
      const now = new Date().toISOString();

      // Check database connectivity
      try {
        const { error } = await supabase.from('calls').select('count').limit(1);
        checks.push({
          name: 'Database',
          status: error ? 'error' : 'healthy',
          message: error ? error.message : 'Connected',
          last_checked: now
        });
      } catch (err) {
        checks.push({
          name: 'Database',
          status: 'error',
          message: 'Connection failed',
          last_checked: now
        });
      }

      // Check auth functionality
      try {
        const { data: { user } } = await supabase.auth.getUser();
        checks.push({
          name: 'Authentication',
          status: 'healthy',
          message: user ? 'User authenticated' : 'No user session',
          last_checked: now
        });
      } catch (err) {
        checks.push({
          name: 'Authentication',
          status: 'error',
          message: 'Auth check failed',
          last_checked: now
        });
      }

      // Check edge functions
      try {
        const { error } = await supabase.functions.invoke('check-email-config');
        checks.push({
          name: 'Edge Functions',
          status: error ? 'warning' : 'healthy',
          message: error ? 'Some functions may be unavailable' : 'Functions accessible',
          last_checked: now
        });
      } catch (err) {
        checks.push({
          name: 'Edge Functions',
          status: 'error',
          message: 'Functions unreachable',
          last_checked: now
        });
      }

      return checks;
    },
    refetchInterval: 60000, // Check every minute
  });

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: SystemCheck['status']) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
    }
  };

  return (
    <RoleCheck adminOnly>
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Running health checks...</div>
          ) : (
            <div className="space-y-3">
              {healthChecks?.map((check) => (
                <div key={check.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusColor(check.status)}>
                      {check.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {check.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </RoleCheck>
  );
}
