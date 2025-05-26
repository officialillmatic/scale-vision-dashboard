
import { createErrorResponse, createSuccessResponse } from './corsUtils.ts';
import { getTestAgent, createTestPayload, sendWebhookRequest } from './testUtils.ts';

export async function simulateWebhookCall(supabaseClient: any, payload: any, supabaseUrl: string, retellSecret: string | undefined) {
  try {
    console.log('[WEBHOOK-TEST] Simulating webhook call...');
    
    // Get a real agent to test with
    const testAgent = await getTestAgent(supabaseClient);

    // Create a test webhook payload
    const testCallId = `test_${Date.now()}`;
    const testPayload = createTestPayload(testCallId, testAgent.retell_agent_id);

    if (!retellSecret) {
      return createErrorResponse('RETELL_SECRET not configured for testing', 500);
    }

    // Send to webhook endpoint
    const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;
    const { response, result } = await sendWebhookRequest(webhookUrl, testPayload, retellSecret);
    
    return createSuccessResponse({
      test_status: response.ok ? 'success' : 'failed',
      webhook_response: result,
      test_payload: testPayload,
      response_status: response.status
    });

  } catch (error) {
    return createErrorResponse(`Simulation failed: ${error.message}`, 500);
  }
}
