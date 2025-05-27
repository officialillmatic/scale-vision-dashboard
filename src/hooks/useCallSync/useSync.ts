
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SyncResponse } from "./types";

export const useSync = (refetch: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
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
};
