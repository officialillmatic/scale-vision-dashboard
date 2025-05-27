
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TestResponse } from "./types";

export const useApiTest = () => {
  return useMutation({
    mutationFn: async (): Promise<TestResponse> => {
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
};
