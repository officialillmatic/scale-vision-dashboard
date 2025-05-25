
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super admin
    const { data: isSuperAdmin, error: superAdminError } = await supabaseClient
      .rpc('is_super_admin', { check_user_id: user.id })

    if (superAdminError || !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Super admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, companyId, amount, description } = await req.json()

    if (!userId || !companyId || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, companyId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user balance
    const { error: balanceError } = await supabaseClient
      .rpc('update_user_balance', {
        p_user_id: userId,
        p_company_id: companyId,
        p_amount: amount
      })

    if (balanceError) {
      console.error('Error updating balance:', balanceError)
      return new Response(
        JSON.stringify({ error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create transaction record
    const transactionType = amount > 0 ? 'credit' : 'debit'
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        company_id: companyId,
        amount: Math.abs(amount),
        transaction_type: transactionType,
        description: description || `Admin ${transactionType} adjustment`
      })

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError)
      // Don't fail the request if transaction logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Balance updated successfully. ${transactionType === 'credit' ? 'Added' : 'Deducted'} $${Math.abs(amount).toFixed(2)}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-update-balance function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
