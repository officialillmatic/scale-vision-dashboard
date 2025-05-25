
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders } from "../_shared/corsUtils.ts";
import { validateAuth } from "../_shared/authUtils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[ADMIN_UPDATE_BALANCE] Starting balance update request');
    
    // Validate authentication
    const { user, supabaseClient, error: authError } = await validateAuth(req);
    if (authError) {
      console.error('[ADMIN_UPDATE_BALANCE] Auth validation failed:', authError);
      return authError;
    }

    // Check if user is super admin
    const { data: isSuperAdmin, error: superAdminError } = await supabaseClient.rpc('is_super_admin');
    if (superAdminError || !isSuperAdmin) {
      console.error('[ADMIN_UPDATE_BALANCE] Super admin check failed:', superAdminError);
      return new Response(
        JSON.stringify({ error: 'Access denied: Super admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, companyId, amount, description } = await req.json();

    if (!userId || !companyId || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, companyId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN_UPDATE_BALANCE] Updating balance for user ${userId}, company ${companyId}, amount ${amount}`);

    // Update user balance
    const { error: balanceError } = await supabaseClient.rpc('update_user_balance', {
      p_user_id: userId,
      p_company_id: companyId,
      p_amount: amount
    });

    if (balanceError) {
      console.error('[ADMIN_UPDATE_BALANCE] Balance update failed:', balanceError);
      return new Response(
        JSON.stringify({ error: 'Failed to update balance', details: balanceError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        company_id: companyId,
        amount: amount,
        transaction_type: amount > 0 ? 'credit' : 'debit',
        description: description || `Admin balance adjustment: ${amount > 0 ? '+' : ''}${amount}`
      });

    if (transactionError) {
      console.error('[ADMIN_UPDATE_BALANCE] Transaction record failed:', transactionError);
      // Don't fail the whole operation, just log the error
    }

    console.log('[ADMIN_UPDATE_BALANCE] Balance update completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Balance updated successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN_UPDATE_BALANCE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
