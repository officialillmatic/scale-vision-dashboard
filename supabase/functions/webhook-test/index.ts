
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, createSuccessResponse, createErrorResponse } from "../_shared/corsUtils.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-TEST] ${new Date().toISOString()} - Received ${req.method} request`);
  console.log(`[WEBHOOK-TEST] Headers:`, Object.fromEntries(req.headers.entries()));

  if (req.method === 'GET') {
    return createSuccessResponse({
      message: 'Webhook test endpoint is working',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.text();
      console.log(`[WEBHOOK-TEST] Body length: ${body.length}`);
      console.log(`[WEBHOOK-TEST] Body preview: ${body.substring(0, 500)}...`);
      
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(body);
        console.log(`[WEBHOOK-TEST] Parsed body keys:`, Object.keys(parsedBody));
      } catch (parseError) {
        console.log(`[WEBHOOK-TEST] Body is not valid JSON:`, parseError.message);
      }

      return createSuccessResponse({
        message: 'Webhook test received POST data successfully',
        received_at: new Date().toISOString(),
        body_length: body.length,
        content_type: req.headers.get('content-type'),
        parsed_body: parsedBody
      });
    } catch (error) {
      console.error('[WEBHOOK-TEST] Error processing POST:', error);
      return createErrorResponse(`Error processing request: ${error.message}`, 400);
    }
  }

  return createErrorResponse('Method not allowed', 405);
});
