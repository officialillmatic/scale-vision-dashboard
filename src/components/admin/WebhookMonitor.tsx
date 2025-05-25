
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RoleCheck } from "@/components/auth/RoleCheck";
import { format } from 'date-fns';

interface WebhookHealth {
  last_hour_count: number;
  status: 'active' | 'inactive';
  last_activity: string | null;
}

interface RecentActivity {
  call_id: string;
  timestamp: string;
  call_status: string;
  event_type: string;
}

interface WebhookMonitorData {
  webhook_health: WebhookHealth;
  recent_activity: RecentActivity[];
  timestamp: string;
}

export function WebhookMonitor() {
  const { data: monitorData, isLoading, error } = useQuery({
    queryKey: ['webhook-monitor'],
    queryFn: async (): Promise<WebhookMonitorData> => {
      const { data, error } = await supabase.functions.invoke('webhook-monitor');
      
      if (error) {
        throw new Error(`Webhook monitor error: ${error.message}`);
      }
      
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3
  });

  return (
    <RoleCheck adminOnly>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Webhook Monitor
            {monitorData?.webhook_health && (
              <Badge variant={monitorData.webhook_health.status === 'active' ? 'default' : 'destructive'}>
                {monitorData.webhook_health.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading webhook status...</div>
          ) : error ? (
            <div className="text-red-600">Error: {error.message}</div>
          ) : monitorData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Webhooks (Last Hour)</div>
                  <div className="text-2xl font-bold">{monitorData.webhook_health.last_hour_count}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last Activity</div>
                  <div className="text-sm">
                    {monitorData.webhook_health.last_activity 
                      ? format(new Date(monitorData.webhook_health.last_activity), 'PPp')
                      : 'No activity'
                    }
                  </div>
                </div>
              </div>
              
              {monitorData.recent_activity.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Recent Activity</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {monitorData.recent_activity.slice(0, 10).map((activity) => (
                      <div key={activity.call_id} className="flex justify-between items-center text-xs">
                        <span className="font-mono">{activity.call_id.slice(0, 8)}...</span>
                        <Badge variant="outline" className="text-xs">
                          {activity.call_status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(activity.timestamp), 'HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>
    </RoleCheck>
  );
}
