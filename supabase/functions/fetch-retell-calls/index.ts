
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellApiKey = Deno.env.get('RETELL_API_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[FETCH-RETELL-CALLS] Received ${req.method} request`);

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (!retellApiKey) {
      console.error('[FETCH-RETELL-CALLS] RETELL_API_KEY not configured');
      return createErrorResponse('Retell API key not configured', 500);
    }

    // Parse request body for optional parameters
    let requestBody = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error('[FETCH-RETELL-CALLS] Error parsing request body:', parseError);
    }

    const { 
      agent_id: filterAgentId, 
      limit = 100, 
      after_timestamp,
      before_timestamp 
    } = requestBody as any;

    console.log(`[FETCH-RETELL-CALLS] Fetching calls with filters:`, {
      agent_id: filterAgentId,
      limit,
      after_timestamp,
      before_timestamp
    });

    // Build Retell API URL with query parameters
    const queryParams = new URLSearchParams();
    if (filterAgentId) queryParams.append('agent_id', filterAgentId);
    if (limit) queryParams.append('limit', limit.toString());
    if (after_timestamp) queryParams.append('after_timestamp', after_timestamp);
    if (before_timestamp) queryParams.append('before_timestamp', before_timestamp);

    const retellUrl = `https://api.retellai.com/v2/get-calls${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    console.log(`[FETCH-RETELL-CALLS] Calling Retell API: ${retellUrl}`);

    // Fetch calls from Retell API
    const retellResponse = await fetch(retellUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!retellResponse.ok) {
      console.error(`[FETCH-RETELL-CALLS] Retell API error:`, retellResponse.status, retellResponse.statusText);
      return createErrorResponse(`Retell API error: ${retellResponse.status}`, 500);
    }

    const retellData = await retellResponse.json();
    console.log(`[FETCH-RETELL-CALLS] Retell API response:`, retellData);

    const calls = retellData.calls || [];
    console.log(`[FETCH-RETELL-CALLS] Found ${calls.length} calls from Retell`);

    return createSuccessResponse({
      message: 'Calls fetched successfully from Retell',
      calls: calls,
      total_calls: calls.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[FETCH-RETELL-CALLS] Fatal error:', error);
    return createErrorResponse(`Fetch failed: ${error.message}`, 500);
  }
});
