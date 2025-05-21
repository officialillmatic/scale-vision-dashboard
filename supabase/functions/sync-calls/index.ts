
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateAuth, getUserCompany, checkCompanyAccess } from "../_shared/authUtils.ts";
import { getUserBalance, updateUserBalance, recordTransactions } from "../_shared/userBalanceUtils.ts";
import { generateMockCalls, getUserAgents } from "../_shared/callUtils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Validate auth and get user
    const authResult = await validateAuth(req);
    if (authResult.error) return authResult.error;
    
    const { user, supabaseClient } = authResult;

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

    // If no company ID provided, try to get the user's company
    if (!companyId) {
      const companyResult = await getUserCompany(supabaseClient, user.id);
      if (companyResult.error) return companyResult.error;
      companyId = companyResult.companyId;
    }
    
    // Check if the user has access to the company
    const accessResult = await checkCompanyAccess(supabaseClient, companyId, user.id);
    if (accessResult.error) return accessResult.error;

    // Get the user's assigned agents
    const agentsResult = await getUserAgents(supabaseClient, user.id, companyId);
    if (agentsResult.error) {
      return createErrorResponse('Error fetching user agent data', 500);
    }

    const { userAgentIds, primaryAgentId } = agentsResult;

    // Check the user's balance before generating mock calls
    const balanceResult = await getUserBalance(supabaseClient, user.id, companyId);
    if (balanceResult.error) {
      return createErrorResponse('Error managing user balance', 500);
    }

    const { balanceId, balance: currentBalance, warningThreshold } = balanceResult;

    // Don't generate calls if balance is too low
    if (currentBalance <= 0) {
      return createSuccessResponse({ 
        error: 'Insufficient balance', 
        balance: currentBalance,
        message: 'Your balance is too low to make calls. Please add funds.' 
      }, 403);
    }
    
    // Generate mock call data for development purposes
    const mockCallsCount = 5;
    const { calls: mockCalls, totalCost } = generateMockCalls(
      mockCallsCount,
      companyId,
      user.id,
      currentBalance,
      primaryAgentId
    );
    
    if (mockCalls.length === 0) {
      return createSuccessResponse({ 
        warning: 'No calls generated due to low balance', 
        balance: currentBalance 
      });
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
      return createErrorResponse('Failed to insert calls', 500, insertError);
    }

    // Record the transactions for each call
    const transactions = mockCalls.map(call => ({
      user_id: user.id,
      company_id: companyId,
      amount: call.cost_usd,
      transaction_type: 'deduction',
      description: `Call charge: ${call.duration_sec}s (${call.call_id})`,
    }));

    const transactionResult = await recordTransactions(supabaseClient, transactions);
    if (transactionResult.error) {
      console.error('Error recording transactions:', transactionResult.error);
    }

    // Update the user's balance
    const newBalance = Math.max(0, currentBalance - totalCost);
    const updateResult = await updateUserBalance(supabaseClient, balanceId, newBalance);
    if (updateResult.error) {
      console.error('Error updating balance:', updateResult.error);
    }
    
    // Get all calls for the company to return
    const { data: calls, error: callsError } = await supabaseClient
      .from("calls")
      .select()
      .eq("company_id", companyId)
      .order("timestamp", { ascending: false });
    
    if (callsError) {
      return createErrorResponse('Failed to fetch calls', 500, callsError);
    }
    
    return createSuccessResponse({
      success: true,
      newCalls: insertedCalls?.length || 0,
      totalCalls: calls?.length || 0,
      totalCost: totalCost.toFixed(2),
      newBalance: newBalance.toFixed(2),
      calls,
      balanceWarning: newBalance < warningThreshold ? `Your balance is low (${newBalance.toFixed(2)})` : null
    });
  } catch (error) {
    console.error("Error in function:", error);
    return createErrorResponse("Internal server error", 500, error.message);
  }
});
