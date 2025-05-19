
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

    if (!company) {
      // Also check if user is a member of any company
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
      company = {
        id: membership.companies.id,
        name: membership.companies.name
      }
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
    // Here we would process each call and save to the calls table
    // This is a simplified example - implementation depends on Retell's response format
    
    // Return the processed data
    return new Response(JSON.stringify({ success: true, data: callsData }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
    
  } catch (error) {
    console.error('Error in fetch-retell-calls function:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
