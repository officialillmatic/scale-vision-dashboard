
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TestResponse } from "./types";

export const useApiTest = () => {
  return useMutation({
    mutationFn: async (): Promise<TestResponse> => {
      console.log("[USE_CALL_SYNC] Testing Retell API connectivity...");
      
      // First test the database rate limiting function
      try {
        const { data: rateLimitTest, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_action: 'api_test',
          p_limit_per_hour: 100
        });

        if (rateLimitError) {
          console.error("[USE_CALL_SYNC] Rate limit check failed:", rateLimitError);
          throw new Error(`Rate limiting system error: ${rateLimitError.message}`);
        }

        if (!rateLimitTest) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
      } catch (error: any) {
        console.error("[USE_CALL_SYNC] Rate limit test error:", error);
        throw new Error(`Rate limiting test failed: ${error.message}`);
      }

      // Now test the sync-calls edge function
      console.log("[USE_CALL_SYNC] Testing sync-calls edge function...");
      
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
      } else if (error.message?.includes("Rate limit")) {
        toast.error("Rate limit exceeded. Please wait a moment before testing again.");
      } else {
        toast.error(`Retell API test failed: ${error.message}`);
      }
    },
  });
};
