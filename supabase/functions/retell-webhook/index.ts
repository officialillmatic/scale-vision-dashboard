
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, accept, accept-profile, content-profile',
  'Access-Control-Max-Age': '86400'
};

function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      success: false,
      timestamp: new Date().toISOString()
    }), 
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

function createSuccessResponse(data: any): Response {
  return new Response(
    JSON.stringify({ 
      ...data, 
      success: true,
      timestamp: new Date().toISOString()
    }), 
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  console.log(`[RETELL-WEBHOOK] ${new Date().toISOString()} - Webhook request received`);

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Verify webhook signature
    const signature = req.headers.get('x-retell-signature');
    if (!signature) {
      console.error('[RETELL-WEBHOOK] Missing signature header');
      return createErrorResponse('Missing signature', 401);
    }

    const body = await req.text();
    console.log('[RETELL-WEBHOOK] Received payload:', body);

    // Basic webhook validation (you should implement proper signature verification)
    if (!body || body.trim() === '') {
      return createErrorResponse('Empty payload', 400);
    }

    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('[RETELL-WEBHOOK] Invalid JSON payload:', error);
      return createErrorResponse('Invalid JSON payload', 400);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Log the webhook event
    const { error: logError } = await supabaseClient
      .from('webhook_logs')
      .insert({
        event_type: webhookData.event || 'unknown',
        call_id: webhookData.call?.call_id,
        agent_id: webhookData.call?.agent_id,
        status: 'success',
        processing_time_ms: 0,
        duration_sec: webhookData.call?.duration_sec,
        cost_usd: webhookData.call?.cost_usd
      });

    if (logError) {
      console.error('[RETELL-WEBHOOK] Error logging webhook:', logError);
    }

    console.log('[RETELL-WEBHOOK] Webhook processed successfully');
    
    return createSuccessResponse({
      message: 'Webhook processed successfully',
      event: webhookData.event || 'unknown'
    });

  } catch (error) {
    console.error('[RETELL-WEBHOOK] Error:', error);
    
    // Log error to database
    try {
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseClient
        .from('webhook_errors')
        .insert({
          error_type: 'processing_error',
          error_details: error.message,
          stack_trace: error.stack
        });
    } catch (logError) {
      console.error('[RETELL-WEBHOOK] Failed to log error:', logError);
    }

    return createErrorResponse(`Webhook processing failed: ${error.message}`, 500);
  }
});
