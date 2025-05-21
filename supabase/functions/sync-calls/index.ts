
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

    // Get the user's assigned agents
    const { data: userAgents, error: userAgentsError } = await supabaseClient
      .from('user_agents')
      .select('agent_id, is_primary')
      .eq('user_id', user.id)
      .eq('company_id', companyId);

    if (userAgentsError) {
      console.error('Error fetching user agents:', userAgentsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching user agent data' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    const userAgentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);
    const primaryAgentId = userAgents?.find(ua => ua.is_primary)?.agent_id || null;

    // Check the user's balance before generating mock calls
    const { data: userBalance, error: balanceError } = await supabaseClient
      .from('user_balances')
      .select('id, balance, warning_threshold')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (balanceError) {
      console.error('Error checking user balance:', balanceError);
    }

    // Create balance if it doesn't exist
    let currentBalance = 0;
    let balanceId = null;
    let warningThreshold = 10;

    if (!userBalance) {
      const { data: newBalance, error: createBalanceError } = await supabaseClient
        .from('user_balances')
        .insert({
          user_id: user.id,
          company_id: companyId,
          balance: 50, // Start with $50 for demonstration
          warning_threshold: 10
        })
        .select()
        .single();

      if (createBalanceError) {
        console.error('Error creating user balance:', createBalanceError);
      } else {
        currentBalance = newBalance.balance;
        balanceId = newBalance.id;
        warningThreshold = newBalance.warning_threshold;
      }
    } else {
      currentBalance = userBalance.balance;
      balanceId = userBalance.id;
      warningThreshold = userBalance.warning_threshold || 10;
    }

    // Don't generate calls if balance is too low
    if (currentBalance <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient balance', 
          balance: currentBalance,
          message: 'Your balance is too low to make calls. Please add funds.' 
        }),
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
      let totalCost = 0;
      
      for (let i = 0; i < count; i++) {
        const timestamp = new Date(now);
        timestamp.setHours(now.getHours() - i * 2); // Calls every 2 hours in the past
        
        const duration = Math.floor(Math.random() * 600) + 60; // 1-10 minutes
        const callType = callTypes[Math.floor(Math.random() * callTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        const cost = parseFloat((duration * 0.002).toFixed(4));
        
        totalCost += cost;
        
        // Make sure we don't exceed the user's balance
        if (currentBalance - totalCost < 0) {
          break; // Stop generating calls if we exceed the balance
        }
        
        calls.push({
          call_id: `mock-${crypto.randomUUID()}`,
          company_id: companyId,
          user_id: user.id,
          timestamp: timestamp.toISOString(),
          duration_sec: duration,
          cost_usd: cost,
          from: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          to: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          call_status: status,
          sentiment: sentiment,
          call_type: callType,
          latency_ms: Math.floor(Math.random() * 200) + 50,
          call_summary: `This is a mock ${callType} call summary for development purposes.`,
          agent_id: primaryAgentId // Use the primary agent if available
        });
      }
      
      return { calls, totalCost };
    };
    
    // Generate and insert mock calls
    const { calls: mockCalls, totalCost } = generateMockCalls(mockCallsCount);
    
    if (mockCalls.length === 0) {
      return new Response(
        JSON.stringify({ 
          warning: 'No calls generated due to low balance', 
          balance: currentBalance 
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
      );
    }
    
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

    // Record the transactions for each call
    const transactions = mockCalls.map(call => ({
      user_id: user.id,
      company_id: companyId,
      amount: call.cost_usd,
      transaction_type: 'deduction',
      description: `Call charge: ${call.duration_sec}s (${call.call_id})`,
      // We can't get the call ID here since it's generated during insert
    }));

    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert(transactions);

    if (transactionError) {
      console.error('Error recording transactions:', transactionError);
    }

    // Update the user's balance
    const newBalance = Math.max(0, currentBalance - totalCost);
    const { error: balanceUpdateError } = await supabaseClient
      .from('user_balances')
      .update({ 
        balance: newBalance,
        last_updated: new Date().toISOString()
      })
      .eq('id', balanceId);

    if (balanceUpdateError) {
      console.error('Error updating user balance:', balanceUpdateError);
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
        totalCost: totalCost.toFixed(2),
        newBalance: newBalance.toFixed(2),
        calls,
        balanceWarning: newBalance < warningThreshold ? `Your balance is low (${newBalance.toFixed(2)})` : null
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
