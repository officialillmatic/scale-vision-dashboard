
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { setupTestAgentUserLink } from "@/utils/setupTestData";
import { DebugResults } from "./types";

export function useDebugOperations() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [isSetupRunning, setIsSetupRunning] = useState(false);
  const [results, setResults] = useState<DebugResults | null>(null);
  const { company, user } = useAuth();

  const runSetupTestData = async () => {
    setIsSetupRunning(true);
    try {
      const success = await setupTestAgentUserLink();
      if (success) {
        toast.success("Test data setup completed successfully");
      } else {
        toast.error("Failed to setup test data - check console for details");
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error("Setup failed with error");
    } finally {
      setIsSetupRunning(false);
    }
  };

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
        const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-monitor');
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

  return {
    isDebugging,
    isSetupRunning,
    results,
    runSetupTestData,
    runDebugTests
  };
}
