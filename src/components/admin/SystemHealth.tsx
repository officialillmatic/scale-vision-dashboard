
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Server, Database, Wifi, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  aiApi: 'healthy' | 'warning' | 'error';
  webhooks: 'healthy' | 'warning' | 'error';
  edgeFunctions: 'healthy' | 'warning' | 'error';
  lastCheck: string;
  details: {
    totalCalls: number;
    activeAgents: number;
    recentErrors: number;
    apiConnectivity: boolean;
  };
}

export function SystemHealth() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const performHealthCheck = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("[SYSTEM_HEALTH] Starting comprehensive health check...");

      // Test database connectivity
      console.log("[SYSTEM_HEALTH] Testing database connectivity...");
      const { count: callsCount, error: callsError } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true });
        
      const { count: agentsCount, error: agentsError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Test webhook monitor function
      console.log("[SYSTEM_HEALTH] Testing webhook monitor...");
      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-monitor');

      // Test AI API connectivity
      console.log("[SYSTEM_HEALTH] Testing AI API connectivity...");
      const { data: aiData, error: aiError } = await supabase.functions.invoke('fetch-ai-calls', {
        body: { limit: 1 }
      });

      const healthStatus: SystemStatus = {
        database: callsError || agentsError ? 'error' : 'healthy',
        aiApi: aiError ? 'error' : 'healthy',
        webhooks: webhookError ? 'error' : 'healthy',
        edgeFunctions: webhookError || aiError ? 'warning' : 'healthy',
        lastCheck: new Date().toISOString(),
        details: {
          totalCalls: callsCount || 0,
          activeAgents: agentsCount || 0,
          recentErrors: 0,
          apiConnectivity: !aiError
        }
      };

      setStatus(healthStatus);
      console.log("[SYSTEM_HEALTH] Health check completed:", healthStatus);
      
    } catch (err: any) {
      console.error('[SYSTEM_HEALTH] Health check error:', err);
      setError(err.message || 'Health check failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
    
    // Refresh every 2 minutes
    const interval = setInterval(performHealthCheck, 120000);
    
    return () => clearInterval(interval);
  }, [user]);

  const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Server className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">System Health</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={performHealthCheck}
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
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={performHealthCheck} 
              className="mt-2"
            >
              Retry Check
            </Button>
          </div>
        ) : status ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm">Database</span>
                {getStatusIcon(status.database)}
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span className="text-sm">Edge Functions</span>
                {getStatusIcon(status.edgeFunctions)}
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">AI API</span>
                {getStatusIcon(status.aiApi)}
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span className="text-sm">Webhooks</span>
                {getStatusIcon(status.webhooks)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
              <div>
                <p className="text-muted-foreground">Total Calls</p>
                <p className="font-medium">{status.details.totalCalls}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Agents</p>
                <p className="font-medium">{status.details.activeAgents}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Last checked: {new Date(status.lastCheck).toLocaleTimeString()}
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
