
import { createErrorResponse } from './corsUtils.ts';

export function processWebhookEvent(event: string, callData: any) {
  console.log(`[EVENT-PROCESSOR] Processing event: ${event}`);
  
  // Add event-specific processing
  const processedData = { ...callData };
  
  switch (event) {
    case 'call_started':
      processedData.call_status = 'in_progress';
      console.log(`[EVENT-PROCESSOR] Call started: ${callData.call_id}`);
      break;
      
    case 'call_ended':
    case 'call_disconnected':
      processedData.call_status = 'completed';
      console.log(`[EVENT-PROCESSOR] Call ended: ${callData.call_id}`);
      break;
      
    case 'call_analyzed':
      console.log(`[EVENT-PROCESSOR] Call analyzed: ${callData.call_id}`);
      break;
      
    default:
      console.log(`[EVENT-PROCESSOR] Unknown event type: ${event}, processing as generic call update`);
  }
  
  return processedData;
}

export async function handleTransactionAndBalance(
  supabaseClient: any, 
  event: string, 
  callData: any, 
  userAgent: any
) {
  if (event !== 'call_ended') {
    console.log(`[TRANSACTION] Skipping transaction processing for event: ${event}`);
    return;
  }

  console.log(`[TRANSACTION] Processing transaction for completed call: ${callData.call_id}`);
  
  try {
    const callCost = callData.cost_usd || 0;
    
    if (callCost > 0) {
      // Record the transaction
      const { error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          amount: -callCost, // Negative for debit
          transaction_type: 'call_charge',
          description: `Call charge for ${callData.call_id}`,
          call_id: callData.call_id
        });

      if (transactionError) {
        console.error(`[TRANSACTION] Failed to record transaction:`, transactionError);
      } else {
        console.log(`[TRANSACTION] Recorded call charge: $${callCost}`);
        
        // Update user balance
        const { error: balanceError } = await supabaseClient
          .rpc('update_user_balance', {
            p_user_id: userAgent.user_id,
            p_company_id: userAgent.company_id,
            p_amount: -callCost
          });

        if (balanceError) {
          console.error(`[TRANSACTION] Failed to update balance:`, balanceError);
        } else {
          console.log(`[TRANSACTION] Updated user balance: -$${callCost}`);
        }
      }
    }
  } catch (error) {
    console.error(`[TRANSACTION] Error processing transaction:`, error);
  }
}

export async function logWebhookResult(
  supabaseClient: any,
  event: string,
  callId: string,
  agent: any,
  userAgent: any,
  callData: any,
  status: string,
  startTime: number
) {
  const processingTime = Date.now() - startTime;
  
  try {
    await supabaseClient
      .from('webhook_logs')
      .insert({
        event_type: event,
        call_id: callId,
        agent_id: agent.id,
        user_id: userAgent.user_id,
        company_id: userAgent.company_id,
        status,
        processing_time_ms: processingTime,
        call_data: callData,
        created_at: new Date().toISOString()
      });
      
    console.log(`[WEBHOOK-LOG] Logged ${status} result for ${event} in ${processingTime}ms`);
  } catch (error) {
    console.error(`[WEBHOOK-LOG] Failed to log webhook result:`, error);
  }
}
