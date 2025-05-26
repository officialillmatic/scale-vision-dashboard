
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log("[FETCH_RETELL_CALLS] Function started");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("[FETCH_RETELL_CALLS] No authorization header");
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[FETCH_RETELL_CALLS] Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[FETCH_RETELL_CALLS] Auth verification failed:", authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[FETCH_RETELL_CALLS] Authenticated user:", user.id);

    // Get user's company using the new helper function
    const { data: userCompany, error: companyError } = await supabase.rpc(
      'get_user_company_id_simple'
    );

    if (companyError || !userCompany) {
      console.error("[FETCH_RETELL_CALLS] No company found for user:", companyError);
      return new Response(
        JSON.stringify({ error: 'No company associated with user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[FETCH_RETELL_CALLS] User company:", userCompany);

    // Get Retell API key
    const retellApiKey = Deno.env.get("RETELL_API_KEY");
    if (!retellApiKey) {
      console.error("[FETCH_RETELL_CALLS] Retell API key not configured");
      return new Response(
        JSON.stringify({ error: 'Retell API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch calls from Retell API
    const retellResponse = await fetch("https://api.retellai.com/list-calls", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!retellResponse.ok) {
      console.error("[FETCH_RETELL_CALLS] Retell API error:", retellResponse.status);
      throw new Error(`Retell API error: ${retellResponse.status}`);
    }

    const retellData = await retellResponse.json();
    console.log("[FETCH_RETELL_CALLS] Fetched calls from Retell:", retellData.calls?.length || 0);

    let processedCount = 0;
    let errorCount = 0;

    // Process each call
    if (retellData.calls && Array.isArray(retellData.calls)) {
      for (const call of retellData.calls) {
        try {
          // Map Retell call data to our schema
          const callData = {
            call_id: call.call_id,
            user_id: user.id,
            company_id: userCompany,
            timestamp: new Date(call.start_timestamp * 1000).toISOString(),
            duration_sec: call.duration_sec || 0,
            cost_usd: call.cost || 0,
            sentiment: call.sentiment?.overall_sentiment || null,
            disconnection_reason: call.disconnection_reason || null,
            call_status: call.call_status || 'unknown',
            from: call.from_number || 'unknown',
            to: call.to_number || 'unknown',
            audio_url: call.recording_url || null,
            transcript: call.transcript || null,
            call_type: 'phone_call',
            agent_id: call.agent_id || null,
          };

          // Insert or update call in database
          const { error: insertError } = await supabase
            .from('calls')
            .upsert(callData, { onConflict: 'call_id' });

          if (insertError) {
            console.error("[FETCH_RETELL_CALLS] Error inserting call:", insertError);
            errorCount++;
          } else {
            processedCount++;
          }
        } catch (error) {
          console.error("[FETCH_RETELL_CALLS] Error processing call:", error);
          errorCount++;
        }
      }
    }

    console.log("[FETCH_RETELL_CALLS] Processing complete:", {
      processed: processedCount,
      errors: errorCount,
      total: retellData.calls?.length || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: retellData.calls?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[FETCH_RETELL_CALLS] Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
