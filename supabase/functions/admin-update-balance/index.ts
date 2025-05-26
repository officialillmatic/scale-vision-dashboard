
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateAuth, getUserCompany, checkAdminAccess } from "../_shared/authUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[ADMIN-UPDATE-BALANCE] ${new Date().toISOString()} - Request received`);

  try {
    // Validate authentication
    const { user, supabaseClient, error: authError } = await validateAuth(req);
    if (authError) return authError;

    // Check if user is super admin
    const { data: isSuperAdmin, error: superAdminError } = await supabaseClient.rpc('is_super_admin');
    
    if (superAdminError || !isSuperAdmin) {
      console.error('[ADMIN-UPDATE-BALANCE] Access denied - not super admin');
      return createErrorResponse('Access denied: Super admin required', 403);
    }

    const { userId, companyId, amount, description } = await req.json();

    if (!userId || !companyId || amount === undefined) {
      return createErrorResponse('Missing required fields: userId, companyId, amount', 400);
    }

    console.log(`[ADMIN-UPDATE-BALANCE] Updating balance for user ${userId} by ${amount}`);

    // Update user balance
    const { error: balanceError } = await supabaseClient.rpc('update_user_balance', {
      p_user_id: userId,
      p_company_id: companyId,
      p_amount: amount
    });

    if (balanceError) {
      console.error('[ADMIN-UPDATE-BALANCE] Failed to update balance:', balanceError);
      return createErrorResponse(`Failed to update balance: ${balanceError.message}`, 500);
    }

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        company_id: companyId,
        amount: amount,
        transaction_type: 'admin_adjustment',
        description: description || `Admin balance adjustment: ${amount > 0 ? '+' : ''}${amount}`
      });

    if (transactionError) {
      console.error('[ADMIN-UPDATE-BALANCE] Failed to create transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    console.log(`[ADMIN-UPDATE-BALANCE] Successfully updated balance for user ${userId}`);

    return createSuccessResponse({
      message: 'Balance updated successfully',
      userId,
      companyId,
      amount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ADMIN-UPDATE-BALANCE] Fatal error:', error);
    return createErrorResponse(`Internal server error: ${error.message}`, 500);
  }
});
