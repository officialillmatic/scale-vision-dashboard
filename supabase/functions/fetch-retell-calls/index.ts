
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[FETCH-RETELL-CALLS-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed - only POST requests supported', 405);
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[FETCH-RETELL-CALLS-${requestId}] No authorization header`);
      return createErrorResponse('No authorization header', 401);
    }

    // Initialize Supabase client
    const supabaseUrl = env("SUPABASE_URL");
    const supabaseServiceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[FETCH-RETELL-CALLS-${requestId}] Auth verification failed:`, authError);
      return createErrorResponse('Authentication failed', 401);
    }

    console.log(`[FETCH-RETELL-CALLS-${requestId}] Authenticated user:`, user.id);

    // Get user's company using the helper function
    const { data: userCompany, error: companyError } = await supabase.rpc(
      'get_user_company_id_simple'
    );

    if (companyError || !userCompany) {
      console.error(`[FETCH-RETELL-CALLS-${requestId}] No company found for user:`, companyError);
      return createErrorResponse('No company associated with user', 400);
    }

    console.log(`[FETCH-RETELL-CALLS-${requestId}] User company:`, userCompany);

    // Get Retell API configuration
    const retellApiKey = env("RETELL_API_KEY");
    const retellApiBaseUrl = Deno.env.get('RETELL_API_BASE_URL') || 'https://api.retellai.com/v2';

    // Fetch calls from Retell API
    const retellResponse = await fetch(`${retellApiBaseUrl}/list-calls`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${retellApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 100 })
    });

    if (!retellResponse.ok) {
      console.error(`[FETCH-RETELL-CALLS-${requestId}] Retell API error:`, retellResponse.status);
      const errorText = await retellResponse.text();
      return createErrorResponse(`Retell API error: ${retellResponse.status} - ${errorText}`, 500);
    }

    const retellData = await retellResponse.json();
    console.log(`[FETCH-RETELL-CALLS-${requestId}] Fetched calls from Retell:`, retellData.calls?.length || 0);

    let processedCount = 0;
    let errorCount = 0;
    let newCallsCount = 0;

    // Process each call
    if (retellData.calls && Array.isArray(retellData.calls)) {
      for (const call of retellData.calls) {
        try {
          // Check if call already exists
          const { data: existingCall } = await supabase
            .from('calls')
            .select('id')
            .eq('call_id', call.call_id)
            .single();

          if (existingCall) {
            console.log(`[FETCH-RETELL-CALLS-${requestId}] Call ${call.call_id} already exists, skipping`);
            continue;
          }

          // Map Retell call data to our schema
          const callData = {
            call_id: call.call_id,
            user_id: user.id,
            company_id: userCompany,
            timestamp: new Date(call.start_timestamp * 1000).toISOString(),
            start_time: call.start_timestamp ? new Date(call.start_timestamp * 1000).toISOString() : null,
            duration_sec: call.duration_sec || 0,
            cost_usd: call.cost || 0,
            sentiment: call.sentiment?.overall_sentiment || null,
            sentiment_score: call.sentiment?.score || null,
            disconnection_reason: call.disconnection_reason || null,
            call_status: call.call_status || 'unknown',
            from: call.from_number || 'unknown',
            to: call.to_number || 'unknown',
            from_number: call.from_number || null,
            to_number: call.to_number || null,
            audio_url: call.recording_url || null,
            recording_url: call.recording_url || null,
            transcript: call.transcript || null,
            transcript_url: call.transcript_url || null,
            call_type: 'phone_call',
            agent_id: call.agent_id || null,
            disposition: call.disposition || null,
            latency_ms: call.latency_ms || null,
            call_summary: call.summary || null,
          };

          // Insert call in database
          const { error: insertError } = await supabase
            .from('calls')
            .insert(callData);

          if (insertError) {
            console.error(`[FETCH-RETELL-CALLS-${requestId}] Error inserting call:`, insertError);
            errorCount++;
          } else {
            processedCount++;
            newCallsCount++;
          }
        } catch (error) {
          console.error(`[FETCH-RETELL-CALLS-${requestId}] Error processing call:`, error);
          errorCount++;
        }
      }
    }

    console.log(`[FETCH-RETELL-CALLS-${requestId}] Processing complete:`, {
      processed: processedCount,
      errors: errorCount,
      new_calls: newCallsCount,
      total: retellData.calls?.length || 0
    });

    return createSuccessResponse({
      success: true,
      processed_calls: processedCount,
      new_calls: newCallsCount,
      errors: errorCount,
      total_calls: retellData.calls?.length || 0,
      message: `Successfully processed ${processedCount} calls (${newCallsCount} new calls)`
    });

  } catch (error) {
    console.error(`[FETCH-RETELL-CALLS-${requestId}] Fatal error:`, error);
    return createErrorResponse(`Fetch calls failed: ${error.message}`, 500);
  }
});
