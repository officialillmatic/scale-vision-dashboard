
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY");
const SUPABASE_URL = "https://jqkkhwoybcenxqpvodev.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced retry logic with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "2");
        console.log(`Rate limited, retrying after ${retryAfter} seconds`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
        continue;
      }
      
      // For authentication errors, stop retrying
      if (response.status === 401 || response.status === 403) {
        console.error(`Authentication error: ${response.status}`);
        throw new Error(`Authentication failed with status ${response.status}`);
      }
      
      // For other types of failures
      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error);
      if (retries === maxRetries - 1) throw error;
      
      // Exponential backoff with jitter
      const delay = Math.min(Math.pow(2, retries) * 1000 + Math.random() * 1000, 10000);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
    }
  }
  
  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetch Retell calls function started");
    
    // Validate required environment variables
    if (!RETELL_API_KEY) {
      console.error("Missing RETELL_API_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API key" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the user ID from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create a Supabase client with the user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the user from the token
    console.log("Authenticating user...");
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid authentication" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`User authenticated: ${user.id}`);

    // Fetch calls from Retell API with enhanced retry logic
    console.log("Fetching calls from Retell API...");
    let retellData;
    try {
      const retellResponse = await fetchWithRetry(
        "https://api.retellai.com/v1/calls", 
        {
          headers: {
            "Authorization": `Bearer ${RETELL_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      retellData = await retellResponse.json();
      console.log(`Retrieved ${retellData.calls?.length || 0} calls from Retell API`);
    } catch (retellError) {
      console.error("Failed to fetch from Retell API:", retellError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch calls: ${retellError.message}` }),
        { 
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!retellData.calls || !Array.isArray(retellData.calls)) {
      console.error("Invalid response format from Retell:", retellData);
      return new Response(
        JSON.stringify({ error: "Invalid response format from Retell API" }),
        { 
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create storage bucket if it doesn't exist
    console.log("Ensuring recordings storage bucket exists...");
    try {
      const { error: bucketError } = await supabase
        .storage
        .createBucket('recordings', { 
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
        
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error("Error creating bucket:", bucketError);
      }
    } catch (bucketError) {
      console.error("Error checking/creating bucket:", bucketError);
      // Continue anyway, the bucket might already exist
    }

    // Process each call
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    console.log(`Processing ${retellData.calls.length} calls...`);
    
    for (const call of retellData.calls) {
      try {
        console.log(`Processing call: ${call.call_id}`);
        let audioUrl = null;
        let retries = 0;
        const maxRetries = 3;
        
        // Download and upload recording if available
        if (call.recording_url) {
          console.log(`Call ${call.call_id} has a recording, downloading...`);
          
          while (retries <= maxRetries && !audioUrl) {
            try {
              // Download audio from Retell
              const audioResponse = await fetch(call.recording_url);
              if (audioResponse.ok) {
                console.log(`Downloaded audio for call ${call.call_id}`);
                
                const audioBuffer = await audioResponse.arrayBuffer();
                
                // Upload to Supabase Storage
                const fileName = `${user.id}/${call.call_id}.mp3`;
                console.log(`Uploading to ${fileName}...`);
                
                const { data: uploadData, error: uploadError } = await supabase
                  .storage
                  .from("recordings")
                  .upload(fileName, audioBuffer, {
                    contentType: "audio/mpeg",
                    upsert: true
                  });

                if (uploadError) {
                  throw uploadError;
                } else {
                  // Get public URL for the uploaded file
                  const { data: urlData } = supabase
                    .storage
                    .from("recordings")
                    .getPublicUrl(fileName);
                    
                  audioUrl = urlData.publicUrl;
                  console.log(`Audio uploaded successfully, public URL: ${audioUrl}`);
                  break;
                }
              } else {
                throw new Error(`Audio fetch failed: ${audioResponse.status}`);
              }
            } catch (audioError) {
              console.error(`Audio processing attempt ${retries + 1} failed:`, audioError);
              retries++;
              if (retries <= maxRetries) {
                // Wait before retrying
                const backoffTime = 1000 * Math.pow(2, retries);
                console.log(`Retrying in ${backoffTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
              }
            }
          }
          
          if (!audioUrl) {
            console.error(`Failed to process audio for call ${call.call_id} after ${maxRetries} attempts`);
          }
        } else {
          console.log(`No recording URL available for call ${call.call_id}`);
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
        console.log(`Inserting/updating call ${call.call_id} into database...`);
        const { data, error } = await supabase
          .from("calls")
          .upsert([callData], { onConflict: "call_id" })
          .select();

        if (error) {
          console.error("Database insert error:", error);
          results.push({ call_id: call.call_id, status: "error", error: error.message });
          failCount++;
        } else {
          results.push({ call_id: call.call_id, status: "success", data });
          successCount++;
          console.log(`Successfully processed call ${call.call_id}`);
        }
      } catch (callError) {
        console.error(`Error processing call ${call.call_id}:`, callError);
        results.push({ 
          call_id: call.call_id, 
          status: "error", 
          error: callError instanceof Error ? callError.message : "Unknown error" 
        });
        failCount++;
      }
    }
    
    console.log(`Function complete. Processed ${results.length} calls: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
