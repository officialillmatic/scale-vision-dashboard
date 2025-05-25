
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Bug, Database, Webhook, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface DebugResults {
  databaseTest: any;
  agentTest: any;
  webhookTest: any;
  retellTest: any;
  timestamp: string;
}

export function CallDebugPanel() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [results, setResults] = useState<DebugResults | null>(null);
  const { company, user } = useAuth();

  const runDebugTests = async () => {
    if (!company?.id || !user?.id) {
      toast.error("Missing company or user information");
      return;
    }

    setIsDebugging(true);
    const debugResults: Partial<DebugResults> = {
      timestamp: new Date().toISOString()
    };

    try {
      // Test 1: Database connectivity and permissions
      console.log("[DEBUG] Testing database connectivity...");
      try {
        const { data: callsData, error: callsError } = await supabase
          .from('calls')
          .select('id, call_id, timestamp, company_id')
          .eq('company_id', company.id)
          .limit(5);
          
        const { data: agentsData, error: agentsError } = await supabase
          .from('agents')
          .select('id, name, retell_agent_id')
          .limit(5);
          
        const { data: userAgentsData, error: userAgentsError } = await supabase
          .from('user_agents')
          .select('*')
          .eq('company_id', company.id);

        debugResults.databaseTest = {
          calls: { count: callsData?.length || 0, error: callsError?.message },
          agents: { count: agentsData?.length || 0, error: agentsError?.message },
          userAgents: { count: userAgentsData?.length || 0, error: userAgentsError?.message },
          status: !callsError && !agentsError && !userAgentsError ? 'success' : 'error'
        };
      } catch (error: any) {
        debugResults.databaseTest = { status: 'error', error: error.message };
      }

      // Test 2: Agent-Company relationships
      console.log("[DEBUG] Testing agent relationships...");
      try {
        const { data: relationships, error: relError } = await supabase
          .from('user_agents')
          .select(`
            *,
            agent:agent_id (id, name, retell_agent_id)
          `)
          .eq('company_id', company.id);

        debugResults.agentTest = {
          relationships: relationships || [],
          count: relationships?.length || 0,
          error: relError?.message,
          status: !relError ? 'success' : 'error'
        };
      } catch (error: any) {
        debugResults.agentTest = { status: 'error', error: error.message };
      }

      // Test 3: Webhook connectivity
      console.log("[DEBUG] Testing webhook endpoint...");
      try {
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-test');
        debugResults.webhookTest = {
          response: webhookData,
          error: webhookError?.message,
          status: !webhookError ? 'success' : 'error'
        };
      } catch (error: any) {
        debugResults.webhookTest = { status: 'error', error: error.message };
      }

      // Test 4: Retell API connectivity
      console.log("[DEBUG] Testing Retell API connectivity...");
      try {
        const { data: retellData, error: retellError } = await supabase.functions.invoke('fetch-retell-calls', {
          body: { limit: 3 }
        });
        debugResults.retellTest = {
          response: retellData,
          error: retellError?.message,
          status: !retellError ? 'success' : 'error'
        };
      } catch (error: any) {
        debugResults.retellTest = { status: 'error', error: error.message };
      }

      setResults(debugResults as DebugResults);
      toast.success("Debug tests completed");

    } catch (error: any) {
      console.error("[DEBUG] Failed to run tests:", error);
      toast.error("Debug tests failed");
    } finally {
      setIsDebugging(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Working</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Data Pipeline Debug
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={runDebugTests}
          disabled={isDebugging}
        >
          {isDebugging ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Click "Debug" to test data pipeline connectivity</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm">Database Access</span>
              </div>
              {getStatusBadge(results.databaseTest?.status)}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Agent Relationships</span>
              </div>
              {getStatusBadge(results.agentTest?.status)}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                <span className="text-sm">Webhook Endpoint</span>
              </div>
              {getStatusBadge(results.webhookTest?.status)}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Retell API</span>
              </div>
              {getStatusBadge(results.retellTest?.status)}
            </div>

            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>Calls in DB: {results.databaseTest?.calls?.count || 0}</p>
              <p>Agents configured: {results.databaseTest?.agents?.count || 0}</p>
              <p>Agent relationships: {results.agentTest?.count || 0}</p>
              <p>Last check: {new Date(results.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
