
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useCallSync = (refetch: () => void) => {
  const queryClient = useQueryClient();

  const { 
    mutate: handleSync, 
    isPending: isSyncing 
  } = useMutation({
    mutationFn: async () => {
      try {
        console.log("[USE_CALL_SYNC] Starting call sync...");
        console.log("[USE_CALL_SYNC] Using headers:", {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        });
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Sync operation timed out after 60 seconds")), 60000);
        });
        
        // Create the sync promise with improved headers
        const syncPromise = supabase.functions.invoke("sync-calls", {
          body: {},
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Profile': 'public'
          }
        });
        
        // Race between sync and timeout
        const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error("[USE_CALL_SYNC] Sync error:", error);
          console.error("[USE_CALL_SYNC] Error details:", JSON.stringify(error, null, 2));
          
          // Enhanced error handling
          if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
            throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
          } else if (error.message?.includes('404')) {
            throw new Error("Sync function not found. Please ensure it's properly deployed.");
          } else if (error.message?.includes('401') || error.message?.includes('403')) {
            throw new Error("Authentication failed. Please check your Retell API credentials.");
          }
          
          throw new Error(error.message || "Sync operation failed");
        }
        
        console.log("[USE_CALL_SYNC] Sync response:", data);
        return data;
      } catch (error: any) {
        console.error("[USE_CALL_SYNC] Sync exception:", error);
        
        if (error.message?.includes("timed out")) {
          throw new Error("Sync operation timed out. Please try again in a few moments.");
        }
        
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_SYNC] Sync successful:", data);
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
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-calls"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-previous-calls"] });
      
      // Force refetch after a short delay
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

  const { 
    mutate: handleRegisterWebhook, 
    isPending: isRegisteringWebhook 
  } = useMutation({
    mutationFn: async () => {
      console.log("[USE_CALL_SYNC] Registering Retell webhook...");
      console.log("[USE_CALL_SYNC] Using headers:", {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Profile': 'public'
      });
      
      const { data, error } = await supabase.functions.invoke("register-retell-webhook", {
        body: {},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        console.error("[USE_CALL_SYNC] Webhook registration error:", error);
        console.error("[USE_CALL_SYNC] Error details:", JSON.stringify(error, null, 2));
        
        // Enhanced error handling
        if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
          throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
        }
        
        throw new Error(error.message || "Webhook registration failed");
      }
      
      console.log("[USE_CALL_SYNC] Webhook registration response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_SYNC] Webhook registration successful:", data);
      toast.success("Webhook registered successfully! Real-time call updates are now enabled.");
    },
    onError: (error: any) => {
      console.error("[USE_CALL_SYNC] Webhook registration error:", error);
      
      // Provide more helpful error messages
      if (error.message?.includes("CORS") || error.message?.includes("preflight")) {
        toast.error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
      } else if (error.message?.includes("404")) {
        toast.error("Webhook registration failed: Function not found. Please ensure the register-retell-webhook function is deployed.");
      } else if (error.message?.includes("401") || error.message?.includes("403")) {
        toast.error("Webhook registration failed: Invalid Retell API key. Please check your API credentials.");
      } else if (error.message?.includes("Missing required env var")) {
        toast.error("Webhook registration failed: Missing environment variables. Please contact support.");
      } else {
        toast.error(`Webhook registration failed: ${error.message}`);
      }
    },
  });

  const { 
    mutate: handleTestSync, 
    isPending: isTesting 
  } = useMutation({
    mutationFn: async () => {
      console.log("[USE_CALL_SYNC] Testing Retell API connectivity...");
      console.log("[USE_CALL_SYNC] Using headers:", {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Profile': 'public'
      });
      
      const { data, error } = await supabase.functions.invoke("sync-calls", {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Profile': 'public'
        }
      });
      
      if (error) {
        console.error("[USE_CALL_SYNC] Test error:", error);
        console.error("[USE_CALL_SYNC] Error details:", JSON.stringify(error, null, 2));
        
        // Enhanced error handling
        if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
          throw new Error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
        }
        
        throw new Error(error.message || "Connectivity test failed");
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_SYNC] Test successful:", data);
      toast.success(`Retell API test passed! Found ${data?.callsFound || 0} calls available for sync.`);
    },
    onError: (error: any) => {
      console.error("[USE_CALL_SYNC] Test error:", error);
      
      // Provide more helpful error messages for API tests
      if (error.message?.includes("CORS") || error.message?.includes("preflight")) {
        toast.error("CORS configuration error. The edge functions may need redeployment with updated CORS headers.");
      } else if (error.message?.includes("401") || error.message?.includes("403")) {
        toast.error("Retell API test failed: Invalid API key. Please check your Retell credentials.");
      } else if (error.message?.includes("404")) {
        toast.error("Retell API test failed: API endpoint not found. Please check your Retell integration.");
      } else if (error.message?.includes("timeout")) {
        toast.error("Retell API test failed: Request timed out. Please check your internet connection.");
      } else {
        toast.error(`Retell API test failed: ${error.message}`);
      }
    },
  });

  return {
    handleSync,
    isSyncing,
    handleRegisterWebhook,
    isRegisteringWebhook,
    handleTestSync,
    isTesting
  };
};
