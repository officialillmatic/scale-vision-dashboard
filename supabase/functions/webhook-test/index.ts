
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse } from "../_shared/corsUtils.ts";
import { performHealthCheck } from "../_shared/healthCheck.ts";
import { simulateWebhookCall } from "../_shared/testSimulation.ts";
import { testAgentMapping } from "../_shared/agentMappingTest.ts";
import { validateDataFlow } from "../_shared/dataFlowValidation.ts";
import { testEndToEnd } from "../_shared/endToEndTest.ts";

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

  console.log(`[WEBHOOK-TEST] ${new Date().toISOString()} - Testing webhook system`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'GET') {
      return await performHealthCheck(supabaseClient, retellSecret);
    }

    if (req.method === 'POST') {
      const { action, payload } = await req.json();

      switch (action) {
        case 'simulate_call':
          return await simulateWebhookCall(supabaseClient, payload, supabaseUrl, retellSecret);
        case 'test_agent_mapping':
          return await testAgentMapping(supabaseClient, payload);
        case 'validate_data_flow':
          return await validateDataFlow(supabaseClient);
        case 'test_end_to_end':
          return await testEndToEnd(supabaseClient, payload, supabaseUrl, retellSecret);
        default:
          return createErrorResponse('Unknown test action', 400);
      }
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[WEBHOOK-TEST] Error:', error);
    return createErrorResponse(`Test failed: ${error.message}`, 500);
  }
});
