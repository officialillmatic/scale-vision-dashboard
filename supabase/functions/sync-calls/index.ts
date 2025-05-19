
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Forward the request to the fetch-retell-calls function
    // This eliminates duplication and ensures we're always using the latest data
    const fetchRetellCallsUrl = new URL(req.url);
    fetchRetellCallsUrl.pathname = "/functions/v1/fetch-retell-calls";
    
    const response = await fetch(fetchRetellCallsUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader
      }
    });

    // Return the response from fetch-retell-calls
    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: response.status 
      }
    );
  } catch (error) {
    console.error("Error in function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
