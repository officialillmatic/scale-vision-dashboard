import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client (moved inside try block for better error handling)
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase URL or service key')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract the JWT token from the request
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), 
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    
    // Get the token
    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Get the company for the user
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .or(`owner_id.eq.${user.id}`)
      .maybeSingle()

    if (companyError) {
      console.error('Error fetching company:', companyError)
      return new Response(JSON.stringify({ error: 'Error fetching company data' }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    let companyId = null
    let companyName = null
    
    if (company) {
      companyId = company.id
      companyName = company.name
    } else {
      // Check if user is a member of any company
      const { data: membership, error: membershipError } = await supabase
        .from('company_members')
        .select('company_id, companies:company_id(id, name)')
        .eq('user_id', user.id)
        .maybeSingle()

      if (membershipError) {
        console.error('Error fetching membership:', membershipError)
        return new Response(JSON.stringify({ error: 'Error fetching membership data' }), 
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }

      if (!membership || !membership.companies) {
        console.error('Failed to find company for user:', user.id)
        return new Response(JSON.stringify({ error: 'No company found for user' }), 
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }
      
      // Use the company from membership
      companyId = membership.companies.id
      companyName = membership.companies.name
    }

    // Get the user's assigned agents
    const { data: userAgents, error: userAgentsError } = await supabase
      .from('user_agents')
      .select('agent_id, is_primary')
      .eq('user_id', user.id)
      .eq('company_id', companyId);

    if (userAgentsError) {
      console.error('Error fetching user agents:', userAgentsError);
      return new Response(JSON.stringify({ error: 'Error fetching user agent data' }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Create a map of agent IDs for quick lookup
    const userAgentIds = new Set(userAgents?.map(ua => ua.agent_id) || []);
    const primaryAgentId = userAgents?.find(ua => ua.is_primary)?.agent_id || null;

    // Check user balance before proceeding
    const { data: userBalance, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance, warning_threshold')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle();

    if (balanceError) {
      console.error('Error checking user balance:', balanceError);
      // We will continue even if balance check fails
    }

    // Get the Retell API key
    const retellApiKey = Deno.env.get('RETELL_API_KEY')
    if (!retellApiKey) {
      throw new Error('Retell API key not configured')
    }

    // Make the call to Retell API
    const response = await fetch('https://api.retellai.com/v1/calls', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${retellApiKey}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Retell API error:', errorData)
      return new Response(JSON.stringify({ error: 'Error fetching calls from Retell' }), 
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const callsData = await response.json()
    
    // Process and save the calls to Supabase
    let newCallsCount = 0
    let totalCost = 0;
    
    // For each call in the Retell response, check if it already exists and insert if not
    for (const call of callsData.data || []) {
      // Check if this call already exists in our database
      const { data: existingCall, error: checkError } = await supabase
        .from('calls')
        .select('id')
        .eq('call_id', call.id)
        .maybeSingle()
        
      if (checkError) {
        console.error('Error checking for existing call:', checkError)
        continue // Skip this call but continue processing others
      }
      
      // If call doesn't exist, insert it
      if (!existingCall) {
        // Get call summary if available
        let callSummary = null
        if (call.id) {
          try {
            const summaryResponse = await fetch(`https://api.retellai.com/v1/calls/${call.id}/summary`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${retellApiKey}`
              }
            });
            
            if (summaryResponse.ok) {
              const summaryData = await summaryResponse.json();
              callSummary = summaryData.summary || null;
            }
          } catch (summaryError) {
            console.error('Error fetching call summary:', summaryError);
            // Continue without summary if there's an error
          }
        }
        
        // Calculate cost based on duration
        const durationSec = Math.round((call.duration || 0) / 1000); // Convert ms to seconds
        const costUsd = (durationSec / 60) * 0.02; // $0.02 per minute
        
        // Keep track of the total cost for all new calls
        totalCost += costUsd;

        // Find the agent ID for this call if possible
        let agentId = null;
        // If we have specific agent information from Retell, we should use it here
        // For now, we'll use the primary agent if available
        if (primaryAgentId) {
          agentId = primaryAgentId;
        }
        
        // Transform Retell call data to match our schema
        const callRecord = {
          call_id: call.id,
          user_id: user.id,
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
        }
        
        const { data: insertedCall, error: insertError } = await supabase
          .from('calls')
          .insert(callRecord)
          .select()
          .single();
          
        if (insertError) {
          console.error('Error inserting call:', insertError)
          continue // Skip this call but continue processing others
        }
        
        // Record the transaction for the call cost
        if (insertedCall && costUsd > 0) {
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              company_id: companyId,
              amount: costUsd,
              transaction_type: 'deduction',
              description: `Call charge: ${durationSec}s (${insertedCall.call_id})`,
              call_id: insertedCall.id
            });
            
          if (transactionError) {
            console.error('Error recording transaction:', transactionError);
          }
          
          // Update the user's balance
          const { error: balanceUpdateError } = await supabase
            .from('user_balances')
            .update({ 
              balance: userBalance ? Math.max(0, userBalance.balance - costUsd) : 0,
              last_updated: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('company_id', companyId);
            
          if (balanceUpdateError) {
            console.error('Error updating user balance:', balanceUpdateError);
          }
        }
        
        newCallsCount++;
      }
    }
    
    // Return summary data
    return new Response(JSON.stringify({ 
      success: true, 
      new_calls: newCallsCount,
      total_cost: totalCost.toFixed(2),
      total_calls: callsData.data ? callsData.data.length : 0,
      company: companyName,
      balance: userBalance ? userBalance.balance - totalCost : null,
      balance_warning: userBalance && userBalance.warning_threshold && (userBalance.balance - totalCost) < userBalance.warning_threshold
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
    
  } catch (error) {
    console.error('Error in fetch-retell-calls function:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
});

// Helper function to map Retell call status to our schema
function mapCallStatus(retellStatus) {
  // Define mapping from Retell status to our status
  const statusMap = {
    'completed': 'completed',
    'no-answer': 'no-answer',
    'busy': 'busy',
    'failed': 'failed',
    'voicemail': 'voicemail'
    // Add more mappings as needed
  }
  
  return statusMap[retellStatus] || 'unknown'
}

// Helper function to map call types
function mapCallType(retellCallType) {
  // Define mapping from Retell call types to our schema
  const typeMap = {
    'phone_call': 'phone_call',
    'voicemail': 'voicemail'
    // Add more mappings as needed
  }
  
  return typeMap[retellCallType] || 'other'
}
