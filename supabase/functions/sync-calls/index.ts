
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { mapRetellCallToDatabase, validateCallData, sanitizeCallData } from "../_shared/retellDataMapper.ts";
import type { RetellCallData } from "../_shared/retellDataMapper.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const retellApiKey = Deno.env.get('RETELL_API_KEY')!;

interface SyncRequestBody {
  agent_id?: string;
  limit?: number;
  after_call_id?: string;
  sort_order?: 'asc' | 'desc';
  force_sync?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYNC-CALLS] Received ${req.method} request at ${new Date().toISOString()}`);

  if (req.method !== 'POST') {
    console.error(`[SYNC-CALLS] Invalid method: ${req.method}`);
    return createErrorResponse('Method not allowed', 405);
  }

  // Validate environment variables
  if (!retellApiKey) {
    console.error('[SYNC-CALLS ERROR] Retell API key not configured');
    return createErrorResponse('Retell API key not configured', 500);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[SYNC-CALLS ERROR] Supabase configuration missing');
    return createErrorResponse('Supabase configuration missing', 500);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse and validate request body
    let requestBody: SyncRequestBody = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        requestBody = JSON.parse(text);
      }
    } catch (parseError) {
      console.log('[SYNC-CALLS] No valid JSON body provided, using defaults');
    }

    const { 
      agent_id, 
      limit = 50, 
      after_call_id,
      sort_order = 'desc',
      force_sync = false
    } = requestBody;

    // Validate and cap limit
    const validLimit = Math.min(Math.max(1, limit), 100);

    console.log(`[SYNC-CALLS] Starting sync with params:`, { 
      agent_id, 
      limit: validLimit, 
      after_call_id, 
      sort_order,
      force_sync
    });

    // Build Retell API URL with correct endpoint
    const params = new URLSearchParams();
    if (agent_id) params.append('agent_id', agent_id);
    params.append('limit', String(validLimit));
    if (after_call_id) params.append('after_call_id', after_call_id);
    if (sort_order) params.append('sort_order', sort_order);

    // Fixed: Use correct Retell API endpoint
    const retellUrl = `https://api.retellai.com/v2/list-calls?${params.toString()}`;
    
    console.log(`[SYNC-CALLS] Fetching from Retell API: ${retellUrl}`);

    // Make authenticated request to Retell API
    const retellResponse = await fetch(retellUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0'
      },
    });

    console.log(`[SYNC-CALLS] Retell API response status: ${retellResponse.status}`);

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error('[SYNC-CALLS ERROR] Retell API error:', {
        status: retellResponse.status,
        statusText: retellResponse.statusText,
        headers: Object.fromEntries(retellResponse.headers.entries()),
        error: errorText.substring(0, 500) // Limit error text length
      });
      
      // Provide more specific error messages
      if (retellResponse.status === 401) {
        return createErrorResponse('Invalid Retell API key', 401);
      } else if (retellResponse.status === 403) {
        return createErrorResponse('Retell API access forbidden', 403);
      } else if (retellResponse.status === 404) {
        return createErrorResponse('Retell API endpoint not found - check API version', 404);
      } else if (retellResponse.status === 429) {
        return createErrorResponse('Retell API rate limit exceeded', 429);
      }
      
      return createErrorResponse(`Retell API error: ${retellResponse.status} ${retellResponse.statusText}`, 500);
    }

    let retellData;
    try {
      retellData = await retellResponse.json();
    } catch (jsonError) {
      console.error('[SYNC-CALLS ERROR] Failed to parse Retell API response as JSON:', jsonError);
      return createErrorResponse('Invalid JSON response from Retell API', 500);
    }

    const calls: RetellCallData[] = retellData.calls || retellData.data || [];
    
    console.log(`[SYNC-CALLS] Retrieved ${calls.length} calls from Retell API`);

    if (calls.length === 0) {
      return createSuccessResponse({
        message: 'No calls to sync',
        synced_count: 0,
        total_retrieved: 0,
        timestamp: new Date().toISOString()
      });
    }

    let syncedCount = 0;
    let skippedCount = 0;
    let errors: string[] = [];

    // Process calls in smaller batches for better performance
    const batchSize = 5;
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      console.log(`[SYNC-CALLS] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(calls.length / batchSize)} (${batch.length} calls)`);

      for (const call of batch) {
        try {
          // Validate required fields
          if (!call.call_id) {
            console.warn(`[SYNC-CALLS] Skipping call with missing call_id:`, { call });
            skippedCount++;
            continue;
          }

          if (!call.agent_id) {
            console.warn(`[SYNC-CALLS] Skipping call ${call.call_id} with missing agent_id`);
            skippedCount++;
            continue;
          }

          console.log(`[SYNC-CALLS] Processing call: ${call.call_id}`);

          // Find the agent mapping
          const { data: agent, error: agentError } = await supabaseClient
            .from('agents')
            .select('id, rate_per_minute')
            .eq('retell_agent_id', call.agent_id)
            .maybeSingle();

          if (agentError) {
            console.error(`[SYNC-CALLS] Error fetching agent for retell_agent_id ${call.agent_id}:`, agentError);
            errors.push(`Error fetching agent ${call.agent_id}: ${agentError.message}`);
            continue;
          }

          if (!agent) {
            console.warn(`[SYNC-CALLS] Agent not found for retell_agent_id: ${call.agent_id}`);
            errors.push(`Agent not found: ${call.agent_id}`);
            continue;
          }

          // Find user agent mapping
          const { data: userAgent, error: userAgentError } = await supabaseClient
            .from('user_agents')
            .select('user_id, company_id')
            .eq('agent_id', agent.id)
            .maybeSingle();

          if (userAgentError) {
            console.error(`[SYNC-CALLS] Error fetching user mapping for agent ${agent.id}:`, userAgentError);
            errors.push(`Error fetching user mapping for agent ${agent.id}: ${userAgentError.message}`);
            continue;
          }

          if (!userAgent) {
            console.warn(`[SYNC-CALLS] User mapping not found for agent: ${agent.id}`);
            errors.push(`User mapping not found for agent: ${agent.id}`);
            continue;
          }

          // Use enhanced data mapper
          const mappedCallData = mapRetellCallToDatabase(
            call,
            userAgent.user_id,
            userAgent.company_id,
            agent.id,
            agent.rate_per_minute || 0.02
          );

          // Validate the mapped data
          const validationErrors = validateCallData(mappedCallData);
          if (validationErrors.length > 0) {
            console.error(`[SYNC-CALLS] Validation failed for call ${call.call_id}:`, validationErrors);
            errors.push(`Validation failed for call ${call.call_id}: ${validationErrors.join(', ')}`);
            continue;
          }

          // Sanitize the data
          const sanitizedCallData = sanitizeCallData(mappedCallData);

          console.log(`[SYNC-CALLS] Mapped call data for ${call.call_id}:`, {
            call_id: sanitizedCallData.call_id,
            user_id: sanitizedCallData.user_id,
            company_id: sanitizedCallData.company_id,
            agent_id: sanitizedCallData.agent_id,
            duration_sec: sanitizedCallData.duration_sec,
            cost_usd: sanitizedCallData.cost_usd,
            from_number: sanitizedCallData.from_number,
            to_number: sanitizedCallData.to_number
          });

          // Check if call already exists (unless force_sync is true)
          if (!force_sync) {
            const { data: existingCall } = await supabaseClient
              .from('calls')
              .select('id')
              .eq('call_id', sanitizedCallData.call_id)
              .maybeSingle();
            
            if (existingCall) {
              console.log(`[SYNC-CALLS] Call ${call.call_id} already exists, skipping`);
              skippedCount++;
              continue;
            }
          }

          // Upsert the call with comprehensive error handling
          const { error: upsertError } = await supabaseClient
            .from('calls')
            .upsert(sanitizedCallData, {
              onConflict: 'call_id',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`[SYNC-CALLS] Failed to upsert call ${call.call_id}:`, {
              error: upsertError,
              callData: sanitizedCallData
            });
            errors.push(`Failed to sync call ${call.call_id}: ${upsertError.message}`);
          } else {
            syncedCount++;
            console.log(`[SYNC-CALLS] Successfully synced call: ${call.call_id}`);
          }

        } catch (callError) {
          console.error(`[SYNC-CALLS] Error processing call ${call.call_id}:`, callError);
          errors.push(`Error processing call ${call.call_id}: ${callError.message}`);
        }
      }

      // Small delay between batches to be gentle on the database
      if (i + batchSize < calls.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const summary = {
      message: `Sync completed: ${syncedCount} synced, ${skippedCount} skipped, ${errors.length} errors`,
      synced_count: syncedCount,
      skipped_count: skippedCount,
      total_retrieved: calls.length,
      error_count: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Limit error reporting
      has_more_errors: errors.length > 5,
      timestamp: new Date().toISOString(),
      retell_endpoint_used: retellUrl.split('?')[0]
    };

    console.log(`[SYNC-CALLS] Sync completed:`, summary);

    return createSuccessResponse(summary);

  } catch (error) {
    console.error('[SYNC-CALLS FATAL ERROR] Unexpected error during sync:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
