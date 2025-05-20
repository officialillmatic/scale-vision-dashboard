
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

    const token = authHeader.replace("Bearer ", "");
    
    // Create a Supabase client with the token
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Get the company ID from query parameters or request body
    const url = new URL(req.url);
    let companyId = url.searchParams.get('company_id');
    
    if (!companyId) {
      try {
        const body = await req.json();
        companyId = body.company_id;
      } catch (e) {
        // No body or not JSON
      }
    }

    if (!companyId) {
      // Try to get the user's company
      const { data: company, error: companyError } = await supabaseClient
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      
      if (company) {
        companyId = company.id;
      } else {
        // Check if user is a member of a company
        const { data: membership, error: membershipError } = await supabaseClient
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (membership) {
          companyId = membership.company_id;
        } else {
          return new Response(
            JSON.stringify({ error: 'No company found for user and no company ID provided' }),
            { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
          );
        }
      }
    }
    
    // Check if the user has access to the company
    const { data: hasAccess, error: accessError } = await supabaseClient.rpc(
      "is_company_member",
      { p_company_id: companyId, p_user_id: user.id }
    );
    
    if (accessError || !hasAccess) {
      return new Response(
        JSON.stringify({ error: 'User does not have access to this company' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 403 }
      );
    }
    
    // Generate mock call data for development purposes
    const mockCallsCount = 5;
    const callTypes = ["inbound", "outbound", "missed", "voicemail"];
    const statuses = ["completed", "in-progress", "failed"];
    const sentiments = ["positive", "neutral", "negative"];
    
    const generateMockCalls = (count: number) => {
      const now = new Date();
      const calls = [];
      
      for (let i = 0; i < count; i++) {
        const timestamp = new Date(now);
        timestamp.setHours(now.getHours() - i * 2); // Calls every 2 hours in the past
        
        const duration = Math.floor(Math.random() * 600) + 60; // 1-10 minutes
        const callType = callTypes[Math.floor(Math.random() * callTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        
        calls.push({
          call_id: `mock-${crypto.randomUUID()}`,
          company_id: companyId,
          user_id: user.id,
          timestamp: timestamp.toISOString(),
          duration_sec: duration,
          cost_usd: parseFloat((duration * 0.002).toFixed(4)),
          from: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          to: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          call_status: status,
          sentiment: sentiment,
          call_type: callType,
          latency_ms: Math.floor(Math.random() * 200) + 50,
          call_summary: `This is a mock ${callType} call summary for development purposes.`,
        });
      }
      
      return calls;
    };
    
    // Generate and insert mock calls
    const mockCalls = generateMockCalls(mockCallsCount);
    
    // Insert the mock calls into the database
    const { data: insertedCalls, error: insertError } = await supabaseClient
      .from("calls")
      .upsert(mockCalls, { 
        onConflict: 'call_id',
        ignoreDuplicates: false
      })
      .select();
    
    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to insert calls', details: insertError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }
    
    // Get all calls for the company to return
    const { data: calls, error: callsError } = await supabaseClient
      .from("calls")
      .select()
      .eq("company_id", companyId)
      .order("timestamp", { ascending: false });
    
    if (callsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch calls', details: callsError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        newCalls: insertedCalls?.length || 0,
        totalCalls: calls?.length || 0,
        calls
      }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200 
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
