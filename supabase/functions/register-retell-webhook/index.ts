
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const retellApiKey = env('RETELL_API_KEY');
const publicAppUrl = env('PUBLIC_APP_URL');
const retellApiBaseUrl = Deno.env.get('RETELL_API_BASE_URL') || 'https://api.retellai.com/v2';

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[REGISTER-WEBHOOK] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    const webhookUrl = `${publicAppUrl}/functions/v1/retell-webhook`;
    
    console.log(`[REGISTER-WEBHOOK] Registering webhook at: ${webhookUrl}`);
    console.log(`[REGISTER-WEBHOOK] Using Retell API Key: ${retellApiKey ? 'SET' : 'NOT SET'}`);
    console.log(`[REGISTER-WEBHOOK] Using Retell API Base URL: ${retellApiBaseUrl}`);

    // Use the correct Retell API endpoint for webhook registration
    const response = await fetch(`${retellApiBaseUrl}/register-phone-webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        // Include events that we want to listen for
        events: ['call_started', 'call_ended', 'call_analyzed']
      })
    });

    console.log(`[REGISTER-WEBHOOK] Retell API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[REGISTER-WEBHOOK] Retell API error: ${response.status} - ${errorText}`);
      
      // Try alternative endpoint if the first one fails
      console.log(`[REGISTER-WEBHOOK] Trying alternative endpoint...`);
      
      const altResponse = await fetch(`${retellApiBaseUrl}/webhook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          callback_url: webhookUrl,
          events: ['call_started', 'call_ended', 'call_analyzed']
        })
      });

      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.error(`[REGISTER-WEBHOOK] Alternative endpoint also failed: ${altResponse.status} - ${altErrorText}`);
        return createErrorResponse(`Failed to register webhook: ${response.status} - ${errorText}`, response.status);
      }

      const webhookData = await altResponse.json();
      console.log(`[REGISTER-WEBHOOK] Successfully registered webhook via alternative endpoint:`, webhookData);

      return createSuccessResponse({
        message: 'Webhook registered successfully (alternative endpoint)',
        webhook: webhookData,
        callback_url: webhookUrl
      });
    }

    const webhookData = await response.json();
    console.log(`[REGISTER-WEBHOOK] Successfully registered webhook:`, webhookData);

    return createSuccessResponse({
      message: 'Webhook registered successfully',
      webhook: webhookData,
      callback_url: webhookUrl
    });

  } catch (error) {
    console.error('[REGISTER-WEBHOOK] Fatal error:', error);
    return createErrorResponse(`Webhook registration failed: ${error.message}`, 500);
  }
});
