
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking email configuration...");
    
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const configured = Boolean(resendApiKey && resendApiKey.trim() !== "");
    
    console.log("Email configuration check:", configured ? "CONFIGURED" : "NOT_CONFIGURED");
    
    return new Response(
      JSON.stringify({ 
        configured,
        message: configured ? "Email service is properly configured" : "RESEND_API_KEY not found or empty"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error checking email configuration:", error);
    
    return new Response(
      JSON.stringify({ 
        configured: false, 
        error: error.message,
        message: "Failed to check email configuration"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
