
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
    // Get the request body
    const body = await req.json();
    const { targetUserId, amount, transactionType, description } = body;

    if (!targetUserId || amount === undefined || !transactionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

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

    // Get the target user's company
    const { data: targetUserCompanies, error: targetUserError } = await supabaseClient
      .from("company_members")
      .select("company_id")
      .eq("user_id", targetUserId);

    if (targetUserError) {
      return new Response(
        JSON.stringify({ error: 'Failed to get target user data', details: targetUserError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    if (!targetUserCompanies || targetUserCompanies.length === 0) {
      // Check if the user is a company owner
      const { data: ownedCompanies, error: ownedError } = await supabaseClient
        .from("companies")
        .select("id")
        .eq("owner_id", targetUserId);

      if (ownedError || !ownedCompanies || ownedCompanies.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Target user is not associated with any company' }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 404 }
        );
      }

      targetUserCompanies = ownedCompanies.map(c => ({ company_id: c.id }));
    }

    // Check if the admin user is an admin of any of the target user's companies
    let isAuthorized = false;
    let authorizedCompanyId = null;

    for (const membership of targetUserCompanies) {
      const { data: isAdmin, error: adminCheckError } = await supabaseClient.rpc(
        "is_company_admin",
        { p_company_id: membership.company_id, p_user_id: user.id }
      );

      if (!adminCheckError && isAdmin) {
        isAuthorized = true;
        authorizedCompanyId = membership.company_id;
        break;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Not an admin of any of the target user\'s companies' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 403 }
      );
    }

    // Get or create user balance entry
    const { data: existingBalance, error: balanceCheckError } = await supabaseClient
      .from("user_balances")
      .select("id, balance")
      .eq("user_id", targetUserId)
      .eq("company_id", authorizedCompanyId)
      .maybeSingle();

    if (balanceCheckError && balanceCheckError.message !== "No rows found") {
      return new Response(
        JSON.stringify({ error: 'Failed to check user balance', details: balanceCheckError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    let currentBalance = 0;
    let balanceId;

    if (!existingBalance) {
      // Create a new balance entry
      const { data: newBalance, error: createError } = await supabaseClient
        .from("user_balances")
        .insert({
          user_id: targetUserId,
          company_id: authorizedCompanyId,
          balance: transactionType === 'deduction' ? 0 : amount, // Start with 0 if deduction, or the amount if deposit
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create user balance', details: createError }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
        );
      }

      currentBalance = newBalance.balance;
      balanceId = newBalance.id;
    } else {
      balanceId = existingBalance.id;
      currentBalance = existingBalance.balance;
      
      // Calculate new balance
      let newBalance;
      if (transactionType === 'deduction') {
        newBalance = Math.max(0, currentBalance - Math.abs(amount));
      } else if (transactionType === 'deposit') {
        newBalance = currentBalance + Math.abs(amount);
      } else if (transactionType === 'adjustment') {
        newBalance = Math.max(0, amount); // Set to exact amount
      }

      // Update the balance
      const { error: updateError } = await supabaseClient
        .from("user_balances")
        .update({
          balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq("id", balanceId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update user balance', details: updateError }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
        );
      }

      currentBalance = newBalance;
    }

    // Record the transaction
    const { error: transactionError } = await supabaseClient
      .from("transactions")
      .insert({
        user_id: targetUserId,
        company_id: authorizedCompanyId,
        amount: Math.abs(amount),
        transaction_type: transactionType,
        description: description || `Balance ${transactionType} by ${user.email}`,
        call_id: null
      });

    if (transactionError) {
      // Log but don't fail the whole operation
      console.error('Error recording transaction:', transactionError);
    }

    // Return the updated balance
    return new Response(
      JSON.stringify({
        success: true,
        userId: targetUserId,
        previousBalance: existingBalance?.balance || 0,
        currentBalance,
        transactionAmount: amount,
        transactionType
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );

  } catch (error) {
    console.error("Error in admin-update-balance:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
