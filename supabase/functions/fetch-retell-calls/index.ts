import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from '../_shared/corsUtils.ts';
import { validateAuth, getUserCompany, checkCompanyAccess } from '../_shared/authUtils.ts';
import { getUserBalance, updateUserBalance, recordTransactions } from '../_shared/userBalanceUtils.ts';
import { getUserAgents, mapCallStatus, mapCallType } from '../_shared/callUtils.ts';

// Fetch call summary from Retell API
async function fetchCallSummary(callId: string, retellApiKey: string) {
  try {
    const summaryResponse = await fetch(`https://api.retellai.com/v1/calls/${callId}/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retellApiKey}`
      }
    });
    
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      return summaryData.summary || null;
    }
  } catch (summaryError) {
    console.error('Error fetching call summary:', summaryError);
  }
  return null;
}

// Transform Retell call data to our schema
function transformCallData(
  call: any, 
  userId: string, 
  companyId: string, 
  agentId: string | null,
  agentRate: number,
  callSummary: string | null
) {
  // Calculate cost based on duration and agent-specific rate
  const durationSec = Math.round((call.duration || 0) / 1000); // Convert ms to seconds
  const durationMin = durationSec / 60;
  const costUsd = durationMin * agentRate;
  
  return {
    call_id: call.id,
    user_id: userId,
    company_id: companyId,
    timestamp: new Date(call.start_time || call.created_at).toISOString(),
    duration_sec: durationSec,
    cost_usd: costUsd,
    from: call.from || 'unknown',
    to: call.to || 'unknown',
    call_status: mapCallStatus(call.status),
    disconnection_reason: call.hangup_cause || null,
    sentiment: call.sentiment || null,
    audio_url: call.recording_url || null,
    transcript: call.transcript || null,
    call_type: mapCallType(call.call_type || 'phone_call'),
    latency_ms: call.latency || 0,
    call_summary: callSummary,
    agent_id: agentId
  };
}

// Process and save calls from Retell to our database
async function processRetellCalls(
  callsData: any,
  supabaseClient: any,
  userId: string, 
  companyId: string, 
  retellAgentMap: Map<string, string>,
  agentRates: Map<string, number>,
  primaryAgentId: string | null,
  retellApiKey: string
) {
  let newCallsCount = 0;
  let totalCost = 0;
  
  // For each call in the Retell response, check if it already exists and insert if not
  for (const call of callsData.data || []) {
    // Check if this call already exists in our database
    const { data: existingCall, error: checkError } = await supabaseClient
      .from('calls')
      .select('id')
      .eq('call_id', call.id)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking for existing call:', checkError);
      continue; // Skip this call but continue processing others
    }
    
    // If call doesn't exist, process and insert it
    if (!existingCall) {
      // Get call summary if available
      const callSummary = call.id ? await fetchCallSummary(call.id, retellApiKey) : null;
      
      // Find the agent ID for this call based on Retell's agent ID
      let agentId = null;
      let agentRate = 0.02; // Default rate
      
      // Try to map Retell agent ID to our internal agent ID
      if (call.agent_id && retellAgentMap.has(call.agent_id)) {
        agentId = retellAgentMap.get(call.agent_id);
        if (agentRates.has(agentId)) {
          agentRate = agentRates.get(agentId);
        }
      } else if (primaryAgentId) {
        // Fallback to primary agent if we can't match the Retell agent ID
        agentId = primaryAgentId;
        if (agentRates.has(agentId)) {
          agentRate = agentRates.get(agentId);
        }
      }
      
      // Transform and insert the call record
      const callRecord = transformCallData(
        call,
        userId,
        companyId,
        agentId,
        agentRate,
        callSummary
      );
      
      // Keep track of the total cost for all new calls
      totalCost += callRecord.cost_usd;
      
      const { data: insertedCall, error: insertError } = await supabaseClient
        .from('calls')
        .insert(callRecord)
        .select()
        .single();
        
      if (insertError) {
        console.error('Error inserting call:', insertError);
        continue; // Skip this call but continue processing others
      }
      
      // Record the transaction for the call cost
      if (insertedCall && callRecord.cost_usd > 0) {
        const { error: transactionError } = await supabaseClient
          .from('transactions')
          .insert({
            user_id: userId,
            company_id: companyId,
            amount: callRecord.cost_usd,
            transaction_type: 'deduction',
            description: `Call charge: ${callRecord.duration_sec}s @ $${agentRate.toFixed(4)}/min (${insertedCall.call_id})`,
            call_id: insertedCall.id
          });
          
        if (transactionError) {
          console.error('Error recording transaction:', transactionError);
        }
      }
      
      newCallsCount++;
    }
  }
  
  return { newCallsCount, totalCost };
}

// Main function
serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase URL or service key');
    }
    
    // Validate auth and get user
    const authResult = await validateAuth(req);
    if (authResult.error) return authResult.error;
    
    const { user, supabaseClient } = authResult;

    // Get the company for the user
    const companyResult = await getUserCompany(supabaseClient, user.id);
    if (companyResult.error) return companyResult.error;
    
    const { companyId } = companyResult;

    // Get company name
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
      
    if (companyError) {
      console.error('Error fetching company data:', companyError);
      return createErrorResponse('Error fetching company data', 500);
    }

    // Get the user's assigned agents
    const agentsResult = await getUserAgents(supabaseClient, user.id, companyId);
    if (agentsResult.error) {
      return createErrorResponse('Error fetching user agent data', 500);
    }

    const { primaryAgentId, retellAgentMap, agentRates } = agentsResult;

    // Check user balance before proceeding
    const balanceResult = await getUserBalance(supabaseClient, user.id, companyId);
    if (balanceResult.error) {
      console.error('Error checking user balance:', balanceResult.error);
      // We will continue even if balance check fails
    }

    const { balanceId, balance: currentBalance, warningThreshold } = balanceResult;

    // Get the Retell API key
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    if (!retellApiKey) {
      throw new Error('Retell API key not configured');
    }

    // Make the call to Retell API
    const response = await fetch('https://api.retellai.com/v1/calls', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retellApiKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Retell API error:', errorData);
      return createErrorResponse('Error fetching calls from Retell', response.status);
    }

    const callsData = await response.json();
    
    // Process and save the calls to Supabase
    const { newCallsCount, totalCost } = await processRetellCalls(
      callsData,
      supabaseClient,
      user.id,
      companyId,
      retellAgentMap,
      agentRates,
      primaryAgentId,
      retellApiKey
    );

    // Update the user's balance if we processed new calls
    if (newCallsCount > 0 && totalCost > 0) {
      const newBalance = Math.max(0, currentBalance - totalCost);
      await updateUserBalance(supabaseClient, balanceId, newBalance);
      
      // Return summary data
      return createSuccessResponse({ 
        success: true, 
        new_calls: newCallsCount,
        total_cost: totalCost.toFixed(2),
        total_calls: callsData.data ? callsData.data.length : 0,
        company: company?.name || 'Your company',
        balance: newBalance,
        balance_warning: warningThreshold && newBalance < warningThreshold
      });
    } else {
      // Return summary data with no changes
      return createSuccessResponse({
        success: true,
        new_calls: 0,
        total_cost: '0.00',
        total_calls: callsData.data ? callsData.data.length : 0,
        company: company?.name || 'Your company',
        balance: currentBalance,
        balance_warning: false
      });
    }
  } catch (error) {
    console.error('Error in fetch-retell-calls function:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
});
