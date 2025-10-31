
import { createErrorResponse, createSuccessResponse } from './corsUtils.ts';
import { getTestAgentWithUserMapping, createTestPayload, sendWebhookRequest } from './testUtils.ts';

export async function testEndToEnd(supabaseClient: any, payload: any, supabaseUrl: string, retellSecret: string | undefined) {
  try {
    console.log('[WEBHOOK-TEST] Running end-to-end test...');
    
    // Step 1: Get test agent
    const testAgent = await getTestAgentWithUserMapping(supabaseClient);
    const testCallId = `e2e_test_${Date.now()}`;
    
    // Step 2: Create test payload
    const testPayload = createTestPayload(testCallId, testAgent.retell_agent_id, true);

    // Step 3: Send webhook request
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;
    const { response: webhookResponse, result: webhookResult } = await sendWebhookRequest(
      webhookUrl, 
      testPayload, 
      retellSecret || 'test-secret'
    );

    // Step 4: Verify data was inserted
    const { data: insertedCall, error: callError } = await supabaseClient
      .from('calls')
      .select('*')
      .eq('call_id', testCallId)
      .single();

    // Step 5: Verify relationships
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('call_id', testCallId)
      .single();

    // Step 6: Clean up test data
    await supabaseClient.from('calls').delete().eq('call_id', testCallId);
    await supabaseClient.from('transactions').delete().eq('call_id', testCallId);

    return createSuccessResponse({
      test_status: 'completed',
      webhook_response_ok: webhookResponse.ok,
      webhook_response_status: webhookResponse.status,
      webhook_result: webhookResult,
      call_inserted: Boolean(insertedCall && !callError),
      call_data: insertedCall,
      transaction_created: Boolean(transaction && !transactionError),
      transaction_data: transaction,
      test_payload: testPayload,
      agent_used: {
        id: testAgent.id,
        name: testAgent.name,
        retell_agent_id: testAgent.retell_agent_id
      },
      overall_success: webhookResponse.ok && insertedCall && !callError
    });

  } catch (error) {
    return createErrorResponse(`End-to-end test failed: ${error.message}`, 500);
  }
}
