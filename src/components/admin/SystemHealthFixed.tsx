
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Server, Database, Wifi, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SystemStatus {
  database: 'healthy' | 'warning' | 'error';
  aiApi: 'healthy' | 'warning' | 'error';
  webhooks: 'healthy' | 'warning' | 'error';
  edgeFunctions: 'healthy' | 'warning' | 'error';
  lastCheck: string;
  details: {
    totalCalls: number;
    activeAgents: number;
    totalCompanies: number;
    hasEssentialData: boolean;
    apiConnectivity: boolean;
    functionsAccessible: boolean;
  };
}

export function SystemHealthFixed() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const performHealthCheck = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("[SYSTEM_HEALTH] Starting production health check...");

      // Test 1: Database connectivity with enhanced error handling
      console.log("[SYSTEM_HEALTH] Testing database connectivity...");
      
      let dbHealthy = true;
      let totalCalls = 0;
      let activeAgents = 0;
      let totalCompanies = 0;
      let hasEssentialData = false;
      let functionsAccessible = true;

      try {
        // Try basic table access
        const { count: callsCount } = await supabase
          .from('calls')
          .select('*', { count: 'exact', head: true });
        totalCalls = callsCount || 0;

        const { count: agentsCount } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true });
        activeAgents = agentsCount || 0;

        const { count: companiesCount } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });
        totalCompanies = companiesCount || 0;

        hasEssentialData = activeAgents > 0 || totalCompanies > 0;

        // Test database functions
        try {
          await supabase.rpc('is_super_admin_safe');
        } catch (funcError) {
          console.warn("[SYSTEM_HEALTH] Function access warning:", funcError);
          functionsAccessible = false;
        }

      } catch (dbError) {
        console.error("[SYSTEM_HEALTH] Database connectivity error:", dbError);
        dbHealthy = false;
      }

      // Test 2: Edge Functions connectivity
      console.log("[SYSTEM_HEALTH] Testing edge functions...");
      let webhookHealthy = true;
      let aiApiHealthy = true;

      try {
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-monitor');
        if (webhookError) {
          console.warn("[SYSTEM_HEALTH] Webhook monitor warning:", webhookError);
          webhookHealthy = false;
        } else {
          console.log("[SYSTEM_HEALTH] Webhook monitor result:", webhookData);
        }
      } catch (webhookErr) {
        console.error("[SYSTEM_HEALTH] Webhook monitor error:", webhookErr);
        webhookHealthy = false;
      }

      // Test 3: AI API through sync-calls function
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-calls', {
          body: { test: true, limit: 1 }
        });
        if (syncError) {
          console.warn("[SYSTEM_HEALTH] AI API test warning:", syncError);
          aiApiHealthy = false;
        } else {
          console.log("[SYSTEM_HEALTH] AI API test result:", syncData);
        }
      } catch (aiErr) {
        console.error("[SYSTEM_HEALTH] AI API test error:", aiErr);
        aiApiHealthy = false;
      }

      const healthStatus: SystemStatus = {
        database: dbHealthy ? 'healthy' : 'error',
        aiApi: aiApiHealthy ? 'healthy' : 'warning',
        webhooks: webhookHealthy ? 'healthy' : 'warning',
        edgeFunctions: (webhookHealthy && aiApiHealthy) ? 'healthy' : 'warning',
        lastCheck: new Date().toISOString(),
        details: {
          totalCalls,
          activeAgents,
          totalCompanies,
          hasEssentialData,
          apiConnectivity: aiApiHealthy,
          functionsAccessible
        }
      };

      setStatus(healthStatus);
      console.log("[SYSTEM_HEALTH] Health check completed:", healthStatus);
      
      // Show success toast if all systems are healthy
      if (dbHealthy && webhookHealthy && aiApiHealthy) {
        toast.success("All systems are healthy and production-ready!");
      }
      
    } catch (err: any) {
      console.error('[SYSTEM_HEALTH] Health check error:', err);
      setError(err.message || 'Health check failed');
      toast.error("Health check failed: " + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const createTestCall = async () => {
    try {
      console.log("[SYSTEM_HEALTH] Creating test call...");
      toast.info("Creating test call record...");
      
      const { data, error } = await supabase.functions.invoke('sync-calls', {
        body: { 
          force: true,
          company_id: "1cd546c3-07dc-4a8e-b533-92d5edde60dc",
          test: false
        }
      });
      
      if (error) {
        console.error("[SYSTEM_HEALTH] Test call creation error:", error);
        toast.error("Failed to create test call: " + error.message);
      } else {
        console.log("[SYSTEM_HEALTH] Test call creation success:", data);
        toast.success("Test call created successfully!");
        // Refresh health check after creating test call
        setTimeout(performHealthCheck, 2000);
      }
    } catch (err: any) {
      console.error("[SYSTEM_HEALTH] Test call creation exception:", err);
      toast.error("Test call creation failed: " + err.message);
    }
  };

  useEffect(() => {
    performHealthCheck();
    
    // Refresh every 30 seconds
    const interval = setInterval(performHealthCheck, 30000);
    
    return () => clearInterval(interval);
  }, []);

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

  const getOverallStatus = () => {
    if (!status) return 'loading';
    
    const allHealthy = status.database === 'healthy' && 
                     status.aiApi === 'healthy' && 
                     status.webhooks === 'healthy' && 
                     status.edgeFunctions === 'healthy';
    
    if (allHealthy && status.details.hasEssentialData && status.details.totalCalls > 0) {
      return 'production-ready';
    } else if (allHealthy) {
      return 'healthy-needs-data';
    } else {
      return 'needs-attention';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          System Health 
          {overallStatus === 'production-ready' && <Badge className="ml-2 bg-green-100 text-green-800">Production Ready</Badge>}
          {overallStatus === 'healthy-needs-data' && <Badge className="ml-2 bg-yellow-100 text-yellow-800">Needs Data</Badge>}
          {overallStatus === 'needs-attention' && <Badge className="ml-2 bg-red-100 text-red-800">Needs Attention</Badge>}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={createTestCall}
            disabled={isLoading}
          >
            🧪 Create Test Call
          </Button>
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
        </div>
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
                <p className="font-medium text-lg">{status.details.totalCalls}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active Agents</p>
                <p className="font-medium text-lg">{status.details.activeAgents}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Companies</p>
                <p className="font-medium text-lg">{status.details.totalCompanies}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Functions</p>
                <p className="font-medium text-lg">{status.details.functionsAccessible ? '✅' : '❌'}</p>
              </div>
            </div>

            {overallStatus === 'production-ready' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-medium">🎉 System is production-ready!</p>
                <p className="text-green-700 text-xs">All systems are healthy and you have call data.</p>
              </div>
            )}

            {overallStatus === 'healthy-needs-data' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm font-medium">⚠️ Systems healthy, but needs data</p>
                <p className="text-yellow-700 text-xs">Create a test call to verify end-to-end functionality.</p>
              </div>
            )}

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
