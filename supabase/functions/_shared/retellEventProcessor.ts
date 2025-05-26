
export function processWebhookEvent(event: string, sanitizedCallData: any) {
  let finalCallData = { ...sanitizedCallData };
  
  switch (event) {
    case 'call_started':
      finalCallData = {
        ...finalCallData,
        duration_sec: 0,
        cost_usd: 0,
        call_status: 'in_progress',
        sentiment: null,
        sentiment_score: null,
        disconnection_reason: null,
        recording_url: null,
        transcript: null,
        transcript_url: null,
        disposition: null
      };
      console.log(`[WEBHOOK] Processing call_started event for call: ${sanitizedCallData.call_id}`);
      break;

    case 'call_ended':
    case 'call_analyzed':
    case 'call_disconnected':
      finalCallData.call_status = 'completed';
      console.log(`[WEBHOOK] Processing ${event} event for call: ${sanitizedCallData.call_id}`);
      break;

    default:
      console.log(`[WEBHOOK] Processing unknown event type: ${event}, storing as completed`);
      finalCallData.call_status = 'completed';
      break;
  }

  return finalCallData;
}

export async function handleTransactionAndBalance(
  supabaseClient: any,
  event: string,
  finalCallData: any,
  userAgent: any
) {
  // Create transaction record and update balance for completed calls only
  if ((event === 'call_ended' || event === 'call_analyzed' || event === 'call_disconnected') && finalCallData.cost_usd > 0) {
    console.log(`[WEBHOOK] Creating transaction record for cost: ${finalCallData.cost_usd}`);
    
    // Check current balance before deducting
    const { data: currentBalance } = await supabaseClient
      .from('user_balances')
      .select('balance')
      .eq('user_id', userAgent.user_id)
      .eq('company_id', userAgent.company_id)
      .single();

    const balanceBefore = currentBalance?.balance || 0;
    console.log(`[WEBHOOK] Balance before deduction: ${balanceBefore}`);
    
    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userAgent.user_id,
        company_id: userAgent.company_id,
        amount: -finalCallData.cost_usd,
        transaction_type: 'call_cost',
        description: `Call cost for ${finalCallData.call_id} (${finalCallData.duration_sec}s)`,
        call_id: finalCallData.call_id
      });

    if (transactionError) {
      console.error('[WEBHOOK ERROR] Failed to create transaction:', transactionError);
    } else {
      console.log(`[WEBHOOK] Successfully created transaction record`);
    }

    // Update user balance using the RPC function
    const { error: balanceError } = await supabaseClient.rpc('update_user_balance', {
      p_user_id: userAgent.user_id,
      p_company_id: userAgent.company_id,
      p_amount: -finalCallData.cost_usd
    });

    if (balanceError) {
      console.error('[WEBHOOK ERROR] Failed to update user balance:', balanceError);
    } else {
      console.log(`[WEBHOOK] Successfully updated user balance`);
    }

    // Check for low balance warning
    if (balanceBefore - finalCallData.cost_usd < 10) {
      console.warn(`[WEBHOOK WARNING] Low balance for user ${userAgent.user_id}: ${balanceBefore - finalCallData.cost_usd}`);
    }
  }
}

export async function logWebhookResult(
  supabaseClient: any,
  event: string,
  retellCallId: string,
  agent: any,
  userAgent: any,
  finalCallData: any,
  status: 'success' | 'error',
  processingStartTime: number
) {
  try {
    if (status === 'success') {
      await supabaseClient
        .from('webhook_logs')
        .insert({
          event_type: event,
          call_id: retellCallId,
          agent_id: agent.id,
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          cost_usd: finalCallData.cost_usd,
          duration_sec: finalCallData.duration_sec,
          status: 'success',
          processing_time_ms: Date.now() - processingStartTime,
          created_at: new Date().toISOString()
        });
    }
  } catch (logError) {
    console.error('Failed to log webhook result:', logError);
  }
}
