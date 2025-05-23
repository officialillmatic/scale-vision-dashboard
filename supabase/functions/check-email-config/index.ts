
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const isConfigured = !!resendApiKey && resendApiKey.length > 0;
    
    // Log status (but not the actual key)
    console.log(`Email configuration check: ${isConfigured ? "CONFIGURED" : "NOT CONFIGURED"}`);
    
    return new Response(
      JSON.stringify({ 
        configured: isConfigured,
        message: isConfigured 
          ? "Resend API key is configured" 
          : "Resend API key is not configured"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error checking email configuration:", error);
    
    return new Response(
      JSON.stringify({ 
        configured: false, 
        error: "Failed to check email configuration"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
