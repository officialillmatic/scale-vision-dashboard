
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyncResponse {
  synced_calls?: number;
  processed_calls?: number;
  skipped_agents?: number;
  agents_found?: number;
}

export const useCallSync = (refetch: () => void) => {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      console.log("[USE_CALL_SYNC] Starting call sync...");
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Sync operation timed out after 60 seconds")), 60000);
      });
      
      const syncPromise = supabase.functions.invoke("sync-calls", {
        body: {},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error("[USE_CALL_SYNC] Sync error:", error);
        
        if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
          throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
        } else if (error.message?.includes('404')) {
          throw new Error("Sync function not found. Please ensure it's properly deployed.");
        } else if (error.message?.includes('401') || error.message?.includes('403')) {
          throw new Error("Authentication failed. Please check your Retell API credentials.");
        }
        
        throw new Error(error.message || "Sync operation failed");
      }
      
      return data;
    },
    onSuccess: (data) => {
      const syncedCount = data?.synced_calls || 0;
      const processedCount = data?.processed_calls || 0;
      const skippedAgents = data?.skipped_agents || 0;
      const agentsFound = data?.agents_found || 0;
      
      if (syncedCount > 0) {
        toast.success(`Successfully synced ${syncedCount} new calls from ${agentsFound} agents`);
      } else if (skippedAgents > 0) {
        toast.warning(`Sync completed - no new calls found. ${skippedAgents} agents skipped (missing user mappings)`);
      } else if (processedCount > 0) {
        toast.info(`Sync completed - ${processedCount} calls checked, all up to date`);
      } else {
        toast.info("Sync completed - no calls found to process");
      }
      
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-previous-calls"] });
      
      setTimeout(() => {
        refetch();
      }, 1000);
    },
    onError: (error: any) => {
      console.error("[USE_CALL_SYNC] Sync mutation error:", error);
      
      if (error.message?.includes("timeout") || error.message?.includes("timed out")) {
        toast.error("Sync operation timed out. Please check your Retell integration and try again.");
      } else if (error.message?.includes("CORS") || error.message?.includes("preflight")) {
        toast.error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
      } else if (error.message?.includes("401") || error.message?.includes("unauthorized")) {
        toast.error("Authentication failed. Please check your Retell API credentials.");
      } else if (error.message?.includes("404")) {
        toast.error("Sync service not found. Please check your deployment.");
      } else {
        toast.error(`Sync failed: ${error.message}`);
      }
    },
  });

  const testSyncMutation = useMutation({
    mutationFn: async () => {
      console.log("[USE_CALL_SYNC] Starting test sync...");
      
      const { data, error } = await supabase.functions.invoke("sync-calls", {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        throw new Error(error.message || "Test sync failed");
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("API test successful - connection verified");
    },
    onError: (error: any) => {
      toast.error(`API test failed: ${error.message}`);
    },
  });

  const webhookMutation = useMutation({
    mutationFn: async () => {
      console.log("[USE_CALL_SYNC] Registering webhook...");
      
      const { data, error } = await supabase.functions.invoke("register-retell-webhook", {
        body: {},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        throw new Error(error.message || "Webhook registration failed");
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("Webhook registered successfully");
    },
    onError: (error: any) => {
      toast.error(`Webhook registration failed: ${error.message}`);
    },
  });

  return {
    handleSync: () => syncMutation.mutate(),
    isSyncing: syncMutation.isPending,
    handleTestSync: () => testSyncMutation.mutate(),
    isTesting: testSyncMutation.isPending,
    handleRegisterWebhook: () => webhookMutation.mutate(),
    isRegisteringWebhook: webhookMutation.isPending
  };
};
