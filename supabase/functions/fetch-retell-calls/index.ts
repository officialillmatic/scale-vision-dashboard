
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const retellApiKey = Deno.env.get('RETELL_API_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[FETCH-RETELL-CALLS] ${new Date().toISOString()} - API test request`);

  try {
    if (!retellApiKey) {
      console.error('[FETCH-RETELL-CALLS] RETELL_API_KEY not configured');
      return createErrorResponse('Retell API key not configured', 500);
    }

    const { limit = 5 } = await req.json().catch(() => ({}));

    // Test Retell API connectivity
    const response = await fetch('https://api.retellai.com/v2/get-calls', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[FETCH-RETELL-CALLS] Retell API error: ${response.status} ${response.statusText}`);
      return createErrorResponse(`Retell API error: ${response.status}`, response.status);
    }

    const data = await response.json();
    const calls = data.calls || [];

    console.log(`[FETCH-RETELL-CALLS] Successfully fetched ${calls.length} calls from Retell API`);

    return createSuccessResponse({
      calls: calls.slice(0, limit),
      total_calls: calls.length,
      api_status: 'connected',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[FETCH-RETELL-CALLS] Fatal error:', error);
    return createErrorResponse(`API test failed: ${error.message}`, 500);
  }
});
