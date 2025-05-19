
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user's session using the token from the Authorization header
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: userError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user's company information
    const { data: companyMember, error: companyError } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (companyError || !companyMember) {
      console.error("Company retrieval error:", companyError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve company information', details: companyError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch calls from Retell API
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    if (!retellApiKey) {
      console.error("Missing Retell API key");
      return new Response(
        JSON.stringify({ error: 'Retell API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the last 7 days of calls
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      const retellResponse = await fetch('https://api.retellai.com/v1/calls', {
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!retellResponse.ok) {
        const errorText = await retellResponse.text();
        console.error("Retell API error:", errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch calls from Retell API', details: errorText }),
          { status: retellResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const retellData = await retellResponse.json();
      
      // Process each call and insert into the database
      let processed = 0;
      let skipped = 0;
      let errors = 0;
      
      for (const call of retellData.data || []) {
        // Check if this call already exists in the database
        const { data: existingCall, error: checkError } = await supabase
          .from('calls')
          .select('id')
          .eq('call_id', call.id)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking for existing call ${call.id}:`, checkError);
          errors++;
          continue;
        }

        if (existingCall) {
          skipped++;
          continue;
        }

        // Format the call data
        const callRecord = {
          call_id: call.id,
          user_id: user.id,
          company_id: companyMember.company_id,
          timestamp: call.created_at ? new Date(call.created_at).toISOString() : new Date().toISOString(),
          duration_sec: call.duration || 0,
          cost_usd: call.cost || 0,
          call_status: call.status || 'unknown',
          from: call.from || 'unknown',
          to: call.to || 'unknown',
          audio_url: call.recording_url || null,
          sentiment: null,
          disconnection_reason: call.disconnect_reason || null
        };

        // Insert the call into the database
        const { error: insertError } = await supabase
          .from('calls')
          .insert([callRecord]);

        if (insertError) {
          console.error(`Error inserting call ${call.id}:`, insertError);
          errors++;
        } else {
          processed++;
        }
      }

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed, 
          skipped, 
          errors,
          total: processed + skipped + errors 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (retellError) {
      console.error("Error fetching from Retell API:", retellError);
      return new Response(
        JSON.stringify({ error: 'Failed to process Retell API request', details: retellError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (e) {
    console.error("Unhandled exception:", e);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
