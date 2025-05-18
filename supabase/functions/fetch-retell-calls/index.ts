
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
const SUPABASE_URL = "https://jqkkhwoybcenxqpvodev.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
    // Get the user ID from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create a Supabase client with the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (userError || !user) {
      console.error("User error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Fetch calls from Retell API
    const retellResponse = await fetch("https://api.retellai.com/v1/calls", {
      headers: {
        "Authorization": `Bearer ${RETELL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!retellResponse.ok) {
      const errorData = await retellResponse.text();
      console.error("Retell API error:", errorData);
      return new Response(
        JSON.stringify({ error: `Failed to fetch calls: ${retellResponse.statusText}` }),
        { 
          status: retellResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const retellData = await retellResponse.json();
    
    if (!retellData.calls || !Array.isArray(retellData.calls)) {
      console.error("Invalid response format from Retell:", retellData);
      return new Response(
        JSON.stringify({ error: "Invalid response format from Retell API" }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Process each call
    const results = [];
    for (const call of retellData.calls) {
      let audioUrl = null;
      
      // Download and upload recording if available
      if (call.recording_url) {
        try {
          // Download audio from Retell
          const audioResponse = await fetch(call.recording_url);
          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            
            // Upload to Supabase Storage
            const fileName = `${user.id}/${call.call_id}.mp3`;
            const { data: uploadData, error: uploadError } = await supabase
              .storage
              .from("recordings")
              .upload(fileName, audioBuffer, {
                contentType: "audio/mpeg",
                upsert: true
              });

            if (uploadError) {
              console.error("Upload error:", uploadError);
            } else {
              // Get public URL for the uploaded file
              const { data: urlData } = supabase
                .storage
                .from("recordings")
                .getPublicUrl(fileName);
                
              audioUrl = urlData.publicUrl;
            }
          }
        } catch (audioError) {
          console.error("Error processing audio:", audioError);
        }
      }

      // Prepare call data for database
      const callData = {
        user_id: user.id,
        call_id: call.call_id,
        timestamp: new Date(call.timestamp || Date.now()).toISOString(),
        duration_sec: call.duration || 0,
        cost_usd: call.cost || 0.0,
        sentiment: call.sentiment || null,
        disconnection_reason: call.disconnection_reason || null,
        call_status: call.status || "unknown",
        from: call.from || "unknown",
        to: call.to || "unknown",
        audio_url: audioUrl,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from("calls")
        .upsert([callData], { onConflict: "call_id" })
        .select();

      if (error) {
        console.error("Database insert error:", error);
        results.push({ call_id: call.call_id, status: "error", error: error.message });
      } else {
        results.push({ call_id: call.call_id, status: "success", data });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
