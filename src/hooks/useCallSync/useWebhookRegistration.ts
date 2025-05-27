
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WebhookResponse } from "./types";

export const useWebhookRegistration = () => {
  return useMutation({
    mutationFn: async (): Promise<WebhookResponse> => {
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
};
