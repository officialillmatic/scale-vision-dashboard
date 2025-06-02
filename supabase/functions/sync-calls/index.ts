
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[SYNC-CALLS-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    // Load environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const retellApiKey = Deno.env.get('RETELL_API_KEY');

    console.log(`[SYNC-CALLS-${requestId}] Environment check:`, {
      supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'SET' : 'MISSING',
      retellApiKey: retellApiKey ? 'SET' : 'MISSING'
    });

    if (!supabaseUrl || !supabaseServiceKey || !retellApiKey) {
      const missingVars = [];
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      if (!retellApiKey) missingVars.push('RETELL_API_KEY');
      
      console.error(`[SYNC-CALLS-${requestId}] Missing environment variables:`, missingVars);
      return new Response(JSON.stringify({ 
        error: `Missing environment variables: ${missingVars.join(', ')}`,
        requestId 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      console.log(`[SYNC-CALLS-${requestId}] Request body:`, JSON.stringify(requestBody));

      const bypassValidation = requestBody.bypass_validation === true;
      const debugMode = requestBody.debug_mode === true;
      const testMode = requestBody.test === true;

      console.log(`[SYNC-CALLS-${requestId}] Mode flags:`, {
        bypassValidation,
        debugMode,
        testMode
      });

      // Handle test mode (API connectivity check)
      if (testMode) {
        try {
          console.log(`[SYNC-CALLS-${requestId}] Running API connectivity test...`);
          
          const response = await fetch('https://api.retellai.com/v2/list-calls', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 1 })
          });

          console.log(`[SYNC-CALLS-${requestId}] API response status:`, response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SYNC-CALLS-${requestId}] API error:`, errorText);
            throw new Error(`API returned ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          console.log(`[SYNC-CALLS-${requestId}] API test successful:`, {
            callsFound: data.calls?.length || 0,
            hasMore: data.has_more || false
          });

          return new Response(JSON.stringify({
            message: 'API connectivity test passed',
            callsFound: data.calls?.length || 0,
            hasMore: data.has_more || false,
            requestId,
            apiConnected: true,
            success: true
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error(`[SYNC-CALLS-${requestId}] API test failed:`, error);
          return new Response(JSON.stringify({
            error: `API connectivity test failed: ${error.message}`,
            requestId,
            apiConnected: false,
            success: false
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Handle full sync with bypass validation
      if (bypassValidation || debugMode) {
        try {
          console.log(`[SYNC-CALLS-${requestId}] Starting sync with bypass validation...`);

          // First, test API connectivity
          const apiResponse = await fetch('https://api.retellai.com/v2/list-calls', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${retellApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limit: 5 })
          });

          if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`Retell API error ${apiResponse.status}: ${errorText}`);
          }

          const apiData = await apiResponse.json();
          const calls = apiData.calls || [];
          
          console.log(`[SYNC-CALLS-${requestId}] Fetched ${calls.length} calls from API`);

          let syncedCalls = 0;
          let processedCalls = 0;
          const errors = [];

          // DEBUG: Check both tables structure
          console.log(`[SYNC-CALLS-${requestId}] Checking table structures...`);
          
          // Check retell_calls table
          const { data: retellTableCheck, error: retellTableError } = await supabaseClient
            .from('retell_calls')
            .select('*')
            .limit(1);
            
          console.log(`[SYNC-CALLS-${requestId}] retell_calls table check:`, {
            error: retellTableError,
            hasData: retellTableCheck && retellTableCheck.length > 0
          });

          // Check calls table
          const { data: callsTableCheck, error: callsTableError } = await supabaseClient
            .from('calls')
            .select('*')
            .limit(1);
            
          console.log(`[SYNC-CALLS-${requestId}] calls table check:`, {
            error: callsTableError,
            hasData: callsTableCheck && callsTableCheck.length > 0
          });

          for (const call of calls) {
            try {
              processedCalls++;
              
              console.log(`[SYNC-CALLS-${requestId}] Processing call ${call.call_id}:`, {
                agent_id: call.agent_id,
                from_number: call.from_number,
                to_number: call.to_number,
                duration_sec: call.duration_sec,
                call_status: call.call_status,
                start_timestamp: call.start_timestamp
              });

              // Check if call already exists in retell_calls table
              const { data: existingRetellCall, error: checkRetellError } = await supabaseClient
                .from('retell_calls')
                .select('id')
                .eq('call_id', call.call_id)
                .maybeSingle();

              if (checkRetellError) {
                console.error(`[SYNC-CALLS-${requestId}] Error checking existing retell_call:`, checkRetellError);
                errors.push(`Check retell_calls error for ${call.call_id}: ${checkRetellError.message}`);
                continue;
              }

              if (existingRetellCall) {
                console.log(`[SYNC-CALLS-${requestId}] Call ${call.call_id} already exists in retell_calls, skipping`);
                continue;
              }

              // Map call data for retell_calls table
              const retellCallData = {
                call_id: call.call_id,
                user_id: null, // Allow null when bypassing validation
                company_id: null, // Allow null when bypassing validation
                agent_id: null, // Allow null when bypassing validation
                retell_agent_id: call.agent_id || null,
                start_timestamp: call.start_timestamp 
                  ? new Date(call.start_timestamp * 1000).toISOString()
                  : new Date().toISOString(),
                end_timestamp: call.end_timestamp 
                  ? new Date(call.end_timestamp * 1000).toISOString() 
                  : null,
                duration_sec: call.duration_sec || 0,
                duration: call.duration_sec || 0,
                cost_usd: call.call_cost?.combined_cost || 0,
                revenue_amount: 0, // Will be calculated by trigger
                revenue: 0,
                billing_duration_sec: call.duration_sec || 0,
                rate_per_minute: 0.17,
                call_status: call.call_status || 'unknown',
                status: call.call_status || 'unknown',
                from_number: call.from_number || null,
                to_number: call.to_number || null,
                disconnection_reason: call.disconnection_reason || null,
                recording_url: call.recording_url || null,
                transcript: call.transcript || null,
                transcript_url: call.transcript_url || null,
                sentiment: call.call_analysis?.user_sentiment || null,
                sentiment_score: null,
                result_sentiment: call.call_analysis ? JSON.stringify(call.call_analysis) : null,
                disposition: call.disposition || null,
                latency_ms: call.latency?.llm?.p50 || null,
                call_summary: call.call_analysis?.call_summary || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              console.log(`[SYNC-CALLS-${requestId}] Attempting to insert into retell_calls:`, retellCallData);

              // Insert into retell_calls table
              const { data: retellInsertData, error: retellInsertError } = await supabaseClient
                .from('retell_calls')
                .insert(retellCallData)
                .select();

              if (retellInsertError) {
                console.error(`[SYNC-CALLS-${requestId}] retell_calls insert error for ${call.call_id}:`, retellInsertError);
                errors.push(`retell_calls insert error for ${call.call_id}: ${retellInsertError.message}`);
                continue;
              }

              console.log(`[SYNC-CALLS-${requestId}] Successfully inserted into retell_calls:`, retellInsertData);

              // Now check if call exists in calls table
              const { data: existingCall, error: checkError } = await supabaseClient
                .from('calls')
                .select('id')
                .eq('call_id', call.call_id)
                .maybeSingle();

              if (checkError) {
                console.error(`[SYNC-CALLS-${requestId}] Error checking existing call in calls table:`, checkError);
                errors.push(`Check calls table error for ${call.call_id}: ${checkError.message}`);
                continue;
              }

              if (existingCall) {
                console.log(`[SYNC-CALLS-${requestId}] Call ${call.call_id} already exists in calls table, skipping`);
                syncedCalls++; // Count it as synced since retell_calls was inserted
                continue;
              }

              // Map call data for calls table (legacy format)
              const callData = {
                call_id: call.call_id,
                user_id: 'unknown', // Required by calls table
                company_id: 'unknown', // Required by calls table but will be updated by admin
                agent_id: null,
                timestamp: call.start_timestamp 
                  ? new Date(call.start_timestamp * 1000).toISOString()
                  : new Date().toISOString(),
                start_time: call.start_timestamp 
                  ? new Date(call.start_timestamp * 1000).toISOString()
                  : new Date().toISOString(),
                duration_sec: call.duration_sec || 0,
                cost_usd: call.call_cost?.combined_cost || 0,
                revenue_amount: 0,
                billing_duration_sec: call.duration_sec || 0,
                billable_rate_per_minute: 0.17,
                call_status: call.call_status || 'unknown',
                from: call.from_number || 'unknown',
                to: call.to_number || 'unknown',
                from_number: call.from_number || null,
                to_number: call.to_number || null,
                disconnection_reason: call.disconnection_reason || null,
                audio_url: call.recording_url || null,
                recording_url: call.recording_url || null,
                transcript: call.transcript || null,
                transcript_url: call.transcript_url || null,
                sentiment: call.call_analysis?.user_sentiment || null,
                sentiment_score: null,
                result_sentiment: call.call_analysis ? JSON.stringify(call.call_analysis) : null,
                disposition: call.disposition || null,
                latency_ms: call.latency?.llm?.p50 || null,
                call_summary: call.call_analysis?.call_summary || null,
                call_type: 'phone_call'
              };

              console.log(`[SYNC-CALLS-${requestId}] Attempting to insert into calls table:`, callData);

              // Insert into calls table
              const { data: callInsertData, error: callInsertError } = await supabaseClient
                .from('calls')
                .insert(callData)
                .select();

              console.log(`[SYNC-CALLS-${requestId}] calls table insert result:`, {
                data: callInsertData,
                error: callInsertError
              });

              if (callInsertError) {
                console.error(`[SYNC-CALLS-${requestId}] calls table insert error for ${call.call_id}:`, callInsertError);
                console.error(`[SYNC-CALLS-${requestId}] Error details:`, {
                  message: callInsertError.message,
                  details: callInsertError.details,
                  hint: callInsertError.hint,
                  code: callInsertError.code
                });
                errors.push(`calls table insert error for ${call.call_id}: ${callInsertError.message} - ${callInsertError.details || ''}`);
                continue;
              }

              console.log(`[SYNC-CALLS-${requestId}] Successfully synced call ${call.call_id} to both tables`);
              syncedCalls++;

            } catch (callError) {
              console.error(`[SYNC-CALLS-${requestId}] Error processing call ${call.call_id}:`, callError);
              errors.push(`Processing error for ${call.call_id}: ${callError.message}`);
            }
          }

          const summary = {
            message: 'Sync completed',
            synced_calls: syncedCalls,
            processed_calls: processedCalls,
            total_calls_from_api: calls.length,
            bypass_validation: bypassValidation,
            debug_mode: debugMode,
            requestId,
            timestamp: new Date().toISOString(),
            errors: errors.length > 0 ? errors : undefined
          };

          console.log(`[SYNC-CALLS-${requestId}] Sync summary:`, summary);

          return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });

        } catch (error) {
          console.error(`[SYNC-CALLS-${requestId}] Sync failed:`, error);
          return new Response(JSON.stringify({
            error: `Sync failed: ${error.message}`,
            requestId,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Default response for non-bypass requests
      return new Response(JSON.stringify({
        message: 'Sync requires bypass_validation or debug_mode flag',
        requestId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: 'Method not allowed - only POST requests supported',
      requestId
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[SYNC-CALLS-${requestId}] Fatal error:`, error);
    return new Response(JSON.stringify({
      error: `Fatal error: ${error.message}`,
      requestId: requestId || 'unknown'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
