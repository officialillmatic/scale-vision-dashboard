
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellApiKey = Deno.env.get('RETELL_API_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[FETCH-RETELL-CALLS] ${new Date().toISOString()} - Request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (!retellApiKey) {
      console.error('[FETCH-RETELL-CALLS] RETELL_API_KEY not configured');
      return createErrorResponse('Retell API key not configured', 500);
    }

    // Verify user is authenticated and has admin permissions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[FETCH-RETELL-CALLS] No authorization header');
      return createErrorResponse('Unauthorized', 401);
    }

    // Create a client with the user's auth token to check permissions
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('[FETCH-RETELL-CALLS] Authentication failed:', authError);
      return createErrorResponse('Unauthorized', 401);
    }

    console.log(`[FETCH-RETELL-CALLS] User authenticated: ${user.id}`);

    // Check if user is super admin or company owner
    const isSuperAdmin = user.id === '53392e76-008c-4e46-8443-a6ebd6bd4504';
    
    if (!isSuperAdmin) {
      // Check if user owns any company
      const { data: companies, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('owner_id', user.id);

      if (companyError || !companies || companies.length === 0) {
        console.error('[FETCH-RETELL-CALLS] User is not admin or company owner');
        return createErrorResponse('Forbidden: Admin access required', 403);
      }
    }

    console.log(`[FETCH-RETELL-CALLS] User authorized to fetch calls`);

    // Fetch calls from Retell API
    const retellResponse = await fetch('https://api.retellai.com/v2/get-calls', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!retellResponse.ok) {
      console.error(`[FETCH-RETELL-CALLS] Retell API error: ${retellResponse.status} ${retellResponse.statusText}`);
      return createErrorResponse(`Retell API error: ${retellResponse.status}`, retellResponse.status);
    }

    const retellData = await retellResponse.json();
    const calls = retellData.calls || [];

    console.log(`[FETCH-RETELL-CALLS] Fetched ${calls.length} calls from Retell API`);

    let syncedCalls = 0;
    const errors = [];

    // Process each call
    for (const retellCall of calls) {
      try {
        // Find the agent and user mapping
        const { data: agent, error: agentError } = await supabaseClient
          .from('agents')
          .select('id, rate_per_minute')
          .eq('retell_agent_id', retellCall.agent_id)
          .single();

        if (agentError || !agent) {
          console.log(`[FETCH-RETELL-CALLS] No agent found for Retell agent ID: ${retellCall.agent_id}`);
          continue;
        }

        // Find user assignment for this agent
        const { data: userAgent, error: userAgentError } = await supabaseClient
          .from('user_agents')
          .select('user_id, company_id')
          .eq('agent_id', agent.id)
          .single();

        if (userAgentError || !userAgent) {
          console.log(`[FETCH-RETELL-CALLS] No user assignment found for agent: ${agent.id}`);
          continue;
        }

        // Prepare call data
        const callData = {
          call_id: retellCall.call_id,
          user_id: userAgent.user_id,
          company_id: userAgent.company_id,
          agent_id: agent.id,
          timestamp: retellCall.start_timestamp ? new Date(retellCall.start_timestamp).toISOString() : new Date().toISOString(),
          start_time: retellCall.start_timestamp ? new Date(retellCall.start_timestamp).toISOString() : null,
          duration_sec: retellCall.duration || 0,
          cost_usd: (retellCall.duration || 0) * (agent.rate_per_minute || 0.02) / 60,
          call_status: retellCall.call_status || 'completed',
          from: retellCall.from_number || 'unknown',
          to: retellCall.to_number || 'unknown',
          from_number: retellCall.from_number,
          to_number: retellCall.to_number,
          recording_url: retellCall.recording_url,
          transcript: retellCall.transcript,
          transcript_url: retellCall.transcript_url,
          sentiment: retellCall.sentiment,
          sentiment_score: retellCall.sentiment_score,
          disposition: retellCall.disposition,
          disconnection_reason: retellCall.disconnection_reason,
          latency_ms: retellCall.latency_ms,
          call_type: 'phone_call',
          call_summary: retellCall.call_summary
        };

        // Insert/update call using service role
        const { error: upsertError } = await supabaseClient
          .from('calls')
          .upsert(callData, {
            onConflict: 'call_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`[FETCH-RETELL-CALLS] Error upserting call ${retellCall.call_id}:`, upsertError);
          errors.push(`Call ${retellCall.call_id}: ${upsertError.message}`);
        } else {
          syncedCalls++;
          console.log(`[FETCH-RETELL-CALLS] Successfully synced call: ${retellCall.call_id}`);
        }

      } catch (callError) {
        console.error(`[FETCH-RETELL-CALLS] Error processing call ${retellCall.call_id}:`, callError);
        errors.push(`Call ${retellCall.call_id}: ${callError.message}`);
      }
    }

    console.log(`[FETCH-RETELL-CALLS] Sync completed. Synced: ${syncedCalls}, Errors: ${errors.length}`);

    return createSuccessResponse({
      message: 'Calls fetched and synced successfully',
      total_calls_from_retell: calls.length,
      synced_calls: syncedCalls,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[FETCH-RETELL-CALLS] Fatal error:', error);
    return createErrorResponse(`Fetch failed: ${error.message}`, 500);
  }
});
