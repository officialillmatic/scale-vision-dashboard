
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, createSuccessResponse } from "../_shared/corsUtils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-TEST] Received ${req.method} request`);

  if (req.method === 'GET') {
    return createSuccessResponse({
      message: 'Webhook endpoint is working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[WEBHOOK-TEST] Received POST body:', JSON.stringify(body, null, 2));
      
      return createSuccessResponse({
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString(),
        receivedData: body,
        status: 'success'
      });
    } catch (error) {
      console.error('[WEBHOOK-TEST] Error parsing body:', error);
      return createSuccessResponse({
        message: 'Test webhook received but could not parse body',
        timestamp: new Date().toISOString(),
        error: error.message,
        status: 'partial_success'
      });
    }
  }

  return createSuccessResponse({
    message: 'Webhook test endpoint',
    supportedMethods: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  });
});
