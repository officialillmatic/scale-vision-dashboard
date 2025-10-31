import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

export async function processCallCredits(
  supabaseClient: any,
  callData: any,
  userId: string,
  agentId?: string  // AGREGADO: parámetro opcional para el agentId
) {
  console.log(`[CREDIT_PROCESSOR] Processing credits for call: ${callData.call_id}`);
  
  try {
    // CORRECCIÓN PRINCIPAL: Calcular costo correcto usando tarifa del agente
    let callCost = 0;
    
    if (callData.duration_sec && callData.duration_sec > 0) {
      // Buscar el agente y su tarifa
      const { data: agent, error: agentError } = await supabaseClient
        .from('agents')
        .select('rate_per_minute, name')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) {
        console.error(`[CREDIT_PROCESSOR] Agent not found for id: ${agentId}`, agentError);
        // Fallback al costo original de Retell
        callCost = callData.cost_usd || 0;
        console.warn(`[CREDIT_PROCESSOR] Using fallback cost from Retell: $${callCost}`);
      } else {
        // Calcular costo correcto: duración en minutos × tarifa por minuto
        const durationMinutes = callData.duration_sec / 60;
        callCost = durationMinutes * (agent.rate_per_minute || 0);
        
        console.log(`[CREDIT_PROCESSOR] Calculated cost: ${durationMinutes.toFixed(2)}min × $${agent.rate_per_minute}/min = $${callCost.toFixed(4)} (Agent: ${agent.name})`);
      }
    } else {
      console.log(`[CREDIT_PROCESSOR] No duration found, using Retell cost: $${callData.cost_usd || 0}`);
      callCost = callData.cost_usd || 0;
    }
    
    if (callCost <= 0) {
      console.log(`[CREDIT_PROCESSOR] No cost to process for call: ${callData.call_id}`);
      return { success: true, newBalance: null };
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

    console.log(`[CREDIT_PROCESSOR] Credits processed successfully. Calculated cost: $${callCost.toFixed(4)}, New balance: $${newBalance.toFixed(2)}`);
    
    return { 
      success: true, 
      newBalance, 
      wasBlocked: shouldBlock,
      isLow: newBalance <= (credits.warning_threshold || 10),
      isCritical: newBalance <= (credits.critical_threshold || 5),
      calculatedCost: callCost  // AGREGADO: para debugging
    };

  } catch (error) {
    console.error(`[CREDIT_PROCESSOR] Unexpected error:`, error);
    return { error: error };
  }
}