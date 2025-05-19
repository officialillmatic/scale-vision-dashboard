
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

    // Validate company ID is present
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Company ID is required for call synchronization' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    // Get the API key for the call service
    const apiKey = Deno.env.get('RETELL_API_KEY')
    if (!apiKey) {
      throw new Error('Call service API key not configured')
    }

    // Make the call to external API service
    const response = await fetch('https://api.retellai.com/v1/calls', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Call API error:', errorData)
      return new Response(JSON.stringify({ error: 'Error fetching calls from service' }), 
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const callsData = await response.json()
    
    // Process and save the calls to Supabase
    let newCallsCount = 0
    
    // For each call in the API response, check if it already exists and insert if not
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
        // Transform call data to match our schema
        const callRecord = {
          call_id: call.id,
          user_id: user.id,
          company_id: companyId, // Now required and guaranteed to be set
          timestamp: new Date(call.start_time || call.created_at).toISOString(),
          duration_sec: Math.round((call.duration || 0) / 1000), // Convert ms to seconds
          cost_usd: call.billed_duration ? (call.billed_duration / 60000) * 0.02 : 0, // Example cost calculation
          from: call.from || 'unknown',
          to: call.to || 'unknown',
          call_status: mapCallStatus(call.status),
          disconnection_reason: call.hangup_cause || null,
          sentiment: call.sentiment || null,
          audio_url: call.recording_url || null,
          transcript: call.transcript || null
        }
        
        const { error: insertError } = await supabase
          .from('calls')
          .insert(callRecord)
          
        if (insertError) {
          console.error('Error inserting call:', insertError)
          continue // Skip this call but continue processing others
        }
        
        newCallsCount++
      }
    }
    
    // Return summary data
    return new Response(JSON.stringify({ 
      success: true, 
      new_calls: newCallsCount,
      total_calls: callsData.data ? callsData.data.length : 0,
      company: companyName
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
    
  } catch (error) {
    console.error('Error in sync-calls function:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})

// Helper function to map call status to our schema
function mapCallStatus(status) {
  // Define mapping from status to our schema
  const statusMap = {
    'completed': 'completed',
    'no-answer': 'no-answer',
    'busy': 'busy',
    'failed': 'failed',
    'voicemail': 'voicemail'
    // Add more mappings as needed
  }
  
  return statusMap[status] || 'unknown'
}
