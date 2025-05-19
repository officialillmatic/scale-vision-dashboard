
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

interface Call {
  call_id: string;
  duration_sec: number;
  timestamp: string;
  from: string;
  to: string;
  call_status: string;
  sentiment?: string;
  transcript?: string;
  disconnection_reason?: string;
  audio_url?: string;
  cost_usd: number;
}

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

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user's ID from their session
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication error', details: authError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Get the user's company
    const { data: userCompany, error: companyError } = await supabaseClient
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    // If the user is not a company owner, check if they belong to a company
    let companyId;
    if (!userCompany) {
      const { data: memberCompany, error: memberError } = await supabaseClient
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError || !memberCompany) {
        return new Response(
          JSON.stringify({ error: 'User does not belong to any company' }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 403 }
        );
      }

      companyId = memberCompany.company_id;
    } else {
      companyId = userCompany.id;
    }

    // In a production environment, this would connect to your actual call provider API
    // For demo purposes, we're generating mock call data
    const mockCalls: Call[] = [
      {
        call_id: `call_${Date.now()}_1`,
        duration_sec: Math.floor(Math.random() * 300) + 60,
        timestamp: new Date().toISOString(),
        from: "+1234567890",
        to: "+9876543210",
        call_status: "completed",
        sentiment: "positive",
        transcript: "This is a sample transcript of a mock call. The customer was happy with the service.",
        audio_url: "https://example.com/recordings/sample.mp3",
        cost_usd: 0.50
      },
      {
        call_id: `call_${Date.now()}_2`,
        duration_sec: Math.floor(Math.random() * 400) + 30,
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        from: "+1987654321",
        to: "+1234567890",
        call_status: "completed",
        sentiment: "negative",
        transcript: "This is another sample transcript. The customer had some issues that needed to be resolved.",
        audio_url: "https://example.com/recordings/sample2.mp3",
        cost_usd: 0.75
      }
    ];

    // Insert the calls into the database
    const { data: insertedCalls, error: insertError } = await supabaseClient
      .from('calls')
      .upsert(
        mockCalls.map(call => ({
          ...call,
          user_id: user.id,
          company_id: companyId
        }))
      )
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Error inserting calls", details: insertError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Calls synchronized successfully",
        count: insertedCalls?.length || 0
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );
  } catch (error) {
    console.error("Error in function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
