
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateRetellAuth, validateWebhookSecurity } from "../_shared/retellAuth.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const retellSecret = env('RETELL_SECRET');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-TEST] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'GET') {
      // Health check endpoint
      return createSuccessResponse({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'checking...',
          webhook_endpoint: 'active',
          retell_integration: 'checking...',
          retell_secret_configured: Boolean(retellSecret),
          retell_secret_length: retellSecret ? retellSecret.length : 0
        },
        test_endpoints: {
          auth_test: `${supabaseUrl.replace('https://', 'https://')}/functions/v1/webhook-test`,
          webhook_simulation: `${supabaseUrl.replace('https://', 'https://')}/functions/v1/webhook-test`,
          retell_webhook: `${supabaseUrl.replace('https://', 'https://')}/functions/v1/retell-webhook`
        }
      });
    }

    if (req.method === 'POST') {
      const { action, ...testData } = await req.json();

      switch (action) {
        case 'test_auth':
          return await testWebhookAuth(req, retellSecret);
        
        case 'simulate_webhook':
          return await simulateRetellWebhook(req, supabaseClient, retellSecret, testData);
        
        case 'test_retell_webhook_direct':
          return await testRetellWebhookDirect(testData, retellSecret);
        
        default:
          return createErrorResponse('Unknown test action. Use: test_auth, simulate_webhook, test_retell_webhook_direct', 400);
      }
    }

    return createErrorResponse('Method not allowed. Use GET for health check or POST for tests.', 405);

  } catch (error) {
    console.error('[WEBHOOK-TEST] Error:', error);
    return createErrorResponse(`Test failed: ${error.message}`, 500);
  }
});

async function testWebhookAuth(req: Request, retellSecret: string): Promise<Response> {
  console.log('[WEBHOOK-TEST] Testing authentication...');
  
  const headers = Object.fromEntries(req.headers.entries());
  
  // Test security validation
  const securityError = validateWebhookSecurity(req);
  if (securityError) {
    return createSuccessResponse({
      test: 'auth_test',
      security_validation: 'failed',
      error: await securityError.text(),
      headers_received: headers
    });
  }

  // Test authentication
  const authError = validateRetellAuth(req, retellSecret);
  if (authError) {
    return createSuccessResponse({
      test: 'auth_test',
      security_validation: 'passed',
      auth_validation: 'failed',
      error: await authError.text(),
      headers_received: headers,
      retell_secret_configured: Boolean(retellSecret)
    });
  }

  return createSuccessResponse({
    test: 'auth_test',
    security_validation: 'passed',
    auth_validation: 'passed',
    message: 'All authentication checks passed',
    headers_received: headers
  });
}

async function simulateRetellWebhook(req: Request, supabaseClient: any, retellSecret: string, testData: any): Promise<Response> {
  console.log('[WEBHOOK-TEST] Simulating Retell webhook...');
  
  // Create a test payload
  const testPayload = {
    event: testData.event || 'call_ended',
    call: {
      call_id: `test_${Date.now()}`,
      agent_id: testData.agent_id || 'test_agent',
      from_number: '+1234567890',
      to_number: '+0987654321',
      start_timestamp: Date.now() / 1000 - 60,
      end_timestamp: Date.now() / 1000,
      duration: 60,
      call_status: 'completed',
      recording_url: 'https://example.com/recording.mp3',
      transcript: 'Test call transcript',
      sentiment_score: 0.8,
      disposition: 'completed'
    }
  };

  // Send to our webhook endpoint
  const webhookUrl = `${supabaseUrl}/functions/v1/retell-webhook`;
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-retell-token': retellSecret,
        'User-Agent': 'Retell-Webhook-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    return createSuccessResponse({
      test: 'simulate_webhook',
      webhook_response_status: response.status,
      webhook_response: result,
      test_payload: testPayload,
      success: response.ok
    });

  } catch (error) {
    return createErrorResponse(`Webhook simulation failed: ${error.message}`, 500);
  }
}

async function testRetellWebhookDirect(testData: any, retellSecret: string): Promise<Response> {
  console.log('[WEBHOOK-TEST] Testing Retell webhook endpoint directly...');
  
  const testPayload = {
    event: 'call_ended',
    call: {
      call_id: `direct_test_${Date.now()}`,
      agent_id: testData.agent_id || 'test_agent_direct',
      duration: 30,
      call_status: 'completed'
    }
  };

  return createSuccessResponse({
    test: 'retell_webhook_direct',
    message: 'Use curl or similar tool to test:',
    curl_command: `curl -X POST "${supabaseUrl}/functions/v1/retell-webhook" \\
  -H "Content-Type: application/json" \\
  -H "x-retell-token: ${retellSecret}" \\
  -H "User-Agent: Retell-Webhook/1.0" \\
  -d '${JSON.stringify(testPayload, null, 2)}'`,
    test_payload: testPayload,
    expected_headers: {
      'Content-Type': 'application/json',
      'x-retell-token': '[YOUR_RETELL_SECRET]',
      'User-Agent': 'Retell-Webhook/1.0'
    }
  });
}
