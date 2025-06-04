
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

export async function processCallCredits(
  supabaseClient: any,
  callData: any,
  userId: string
) {
  console.log(`[CREDIT_PROCESSOR] Processing credits for call: ${callData.call_id}`);
  
  try {
    const callCost = callData.cost_usd || 0;
    
    if (callCost <= 0) {
      console.log(`[CREDIT_PROCESSOR] No cost to process for call: ${callData.call_id}`);
      return { success: true };
    }

    // Get current user credits
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('current_balance, warning_threshold, critical_threshold, is_blocked')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error(`[CREDIT_PROCESSOR] Error fetching credits:`, creditsError);
      return { error: creditsError };
    }

    if (!credits) {
      console.log(`[CREDIT_PROCESSOR] No credits record found for user: ${userId}`);
      return { error: 'No credits record found' };
    }

    if (credits.is_blocked) {
      console.log(`[CREDIT_PROCESSOR] User account is blocked: ${userId}`);
      return { error: 'Account blocked' };
    }

    const newBalance = Math.max(0, credits.current_balance - callCost);
    const shouldBlock = newBalance <= 0;

    // Update user credits
    const { error: updateError } = await supabaseClient
      .from('user_credits')
      .update({
        current_balance: newBalance,
        is_blocked: shouldBlock,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`[CREDIT_PROCESSOR] Error updating credits:`, updateError);
      return { error: updateError };
    }

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: -callCost,
        transaction_type: 'call_charge',
        description: `Call charge for ${callData.call_id} (${callData.duration_sec || 0}s)`,
        call_id: callData.call_id,
        balance_after: newBalance
      });

    if (transactionError) {
      console.error(`[CREDIT_PROCESSOR] Error creating transaction:`, transactionError);
      // Don't fail the process if transaction logging fails
    }

    console.log(`[CREDIT_PROCESSOR] Credits processed successfully. Cost: $${callCost}, New balance: $${newBalance}`);
    
    return { 
      success: true, 
      newBalance, 
      wasBlocked: shouldBlock,
      isLow: newBalance <= credits.warning_threshold,
      isCritical: newBalance <= credits.critical_threshold
    };

  } catch (error) {
    console.error(`[CREDIT_PROCESSOR] Unexpected error:`, error);
    return { error: error };
  }
}
