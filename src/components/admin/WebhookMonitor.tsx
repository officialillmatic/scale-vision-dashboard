
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WebhookHealth {
  status: 'active' | 'inactive' | 'error';
  last_hour_calls: number;
  recent_calls: number;
  health_score: 'excellent' | 'good' | 'poor';
  agents_active: number;
  last_webhook_time?: string;
  check_timestamp: string;
}

export function WebhookMonitor() {
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchWebhookHealth = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.rpc('get_webhook_health');
      
      if (error) {
        console.error("[WEBHOOK_MONITOR] Database error:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        const healthData = data[0];
        setHealth({
          status: healthData.status as 'active' | 'inactive' | 'error',
          last_hour_calls: Number(healthData.last_hour_calls),
          recent_calls: Number(healthData.recent_calls),
          health_score: healthData.health_score as 'excellent' | 'good' | 'poor',
          agents_active: Number(healthData.agents_active),
          last_webhook_time: healthData.last_webhook_time,
          check_timestamp: healthData.check_timestamp
        });
      } else {
        setHealth({
          status: 'inactive',
          last_hour_calls: 0,
          recent_calls: 0,
          health_score: 'poor',
          agents_active: 0,
          check_timestamp: new Date().toISOString()
        });
      }
      
    } catch (err: any) {
      console.error('[WEBHOOK_MONITOR] Error fetching webhook health:', err);
      setError(err.message || 'Failed to fetch webhook health');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookHealth();
    const interval = setInterval(fetchWebhookHealth, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive': return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHealthScoreColor = (score: string) => {
    switch (score) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Webhook Monitor</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchWebhookHealth}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchWebhookHealth} 
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : health ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.status)}
                <span className="text-sm font-medium">
                  Status: {health.status}
                </span>
              </div>
              <Badge variant="outline" className={getHealthScoreColor(health.health_score)}>
                {health.health_score}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Last Hour</p>
                <p className="font-medium">{health.last_hour_calls} calls</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recent (5min)</p>
                <p className="font-medium">{health.recent_calls} calls</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Agents</p>
                <p className="font-medium">{health.agents_active}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Activity</p>
                <p className="font-medium text-xs">
                  {health.last_webhook_time 
                    ? new Date(health.last_webhook_time).toLocaleTimeString()
                    : 'No recent activity'
                  }
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(health.check_timestamp).toLocaleTimeString()}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
