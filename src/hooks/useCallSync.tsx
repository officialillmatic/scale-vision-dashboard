
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
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Sync timed out")), 60000); // 60 second timeout
        });
        
        // Create the sync promise
        const syncPromise = supabase.functions.invoke("sync-calls", {
          body: {},
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        // Race between sync and timeout
        const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error("[USE_CALL_SYNC] Sync error:", error);
          throw new Error(error.message || "Sync failed");
        }
        
        console.log("[USE_CALL_SYNC] Sync response:", data);
        return data;
      } catch (error: any) {
        console.error("[USE_CALL_SYNC] Sync exception:", error);
        
        if (error.message?.includes("timed out")) {
          throw new Error("Sync timed out. Please try again.");
        }
        
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_SYNC] Sync successful:", data);
      const syncedCount = data?.synced_calls || 0;
      const processedCount = data?.processed_calls || 0;
      
      if (syncedCount > 0) {
        toast.success(`Successfully synced ${syncedCount} new calls (${processedCount} total processed)`);
      } else {
        toast.info(`Sync completed - no new calls found (${processedCount} calls processed)`);
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
        toast.error("Sync timed out. Please check your Retell integration and try again.");
      } else {
        toast.error(`Failed to sync calls: ${error.message}`);
      }
    },
  });

  const { 
    mutate: handleRegisterWebhook, 
    isPending: isRegisteringWebhook 
  } = useMutation({
    mutationFn: async () => {
      console.log("[USE_CALL_SYNC] Registering Retell webhook...");
      
      const { data, error } = await supabase.functions.invoke("register-retell-webhook", {
        body: {},
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (error) {
        console.error("[USE_CALL_SYNC] Webhook registration error:", error);
        throw new Error(error.message || "Webhook registration failed");
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_SYNC] Webhook registration successful:", data);
      toast.success("Retell webhook registered successfully!");
    },
    onError: (error: any) => {
      console.error("[USE_CALL_SYNC] Webhook registration error:", error);
      toast.error(`Failed to register webhook: ${error.message}`);
    },
  });

  const { 
    mutate: handleTestSync, 
    isPending: isTesting 
  } = useMutation({
    mutationFn: async () => {
      console.log("[USE_CALL_SYNC] Testing Retell API connectivity...");
      
      const { data, error } = await supabase.functions.invoke("sync-calls", {
        body: { test: true },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (error) {
        console.error("[USE_CALL_SYNC] Test error:", error);
        throw new Error(error.message || "Test failed");
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("[USE_CALL_SYNC] Test successful:", data);
      toast.success(`Retell API test passed! Found ${data?.callsFound || 0} calls available.`);
    },
    onError: (error: any) => {
      console.error("[USE_CALL_SYNC] Test error:", error);
      toast.error(`Retell API test failed: ${error.message}`);
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
