
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateAuth, getUserCompany, checkCompanyAccess } from "../_shared/authUtils.ts";
import { mapRetellCallToDatabase, validateCallData, type RetellCallData } from "../_shared/retellDataMapper.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYNC-CALLS] Received ${req.method} request`);

  try {
    // Validate auth and get user
    const authResult = await validateAuth(req);
    if (authResult.error) return authResult.error;
    
    const { user, supabaseClient } = authResult;

    // Get the company ID from query parameters or request body
    const url = new URL(req.url);
    let companyId = url.searchParams.get('company_id');
    
    if (!companyId) {
      try {
        const body = await req.json();
        companyId = body.company_id;
      } catch (e) {
        // No body or not JSON
      }
    }

    // If no company ID provided, try to get the user's company
    if (!companyId) {
      const companyResult = await getUserCompany(supabaseClient, user.id);
      if (companyResult.error) return companyResult.error;
      companyId = companyResult.companyId;
    }
    
    // Check if the user has access to the company
    const accessResult = await checkCompanyAccess(supabaseClient, companyId, user.id);
    if (accessResult.error) return accessResult.error;

    console.log(`[SYNC-CALLS] Processing sync for company: ${companyId}, user: ${user.id}`);

    // Get the user's assigned agents with their retell_agent_ids
    const { data: userAgents, error: userAgentsError } = await supabaseClient
      .from("user_agents")
      .select(`
        agent_id,
        is_primary,
        agents!inner (
          id,
          name,
          retell_agent_id,
          rate_per_minute
        )
      `)
      .eq("user_id", user.id)
      .eq("company_id", companyId);

    if (userAgentsError) {
      console.error("[SYNC-CALLS ERROR] Error fetching user agents:", userAgentsError);
      return createErrorResponse('Error fetching user agent data', 500);
    }

    if (!userAgents || userAgents.length === 0) {
      console.log("[SYNC-CALLS] No agents assigned to user");
      return createErrorResponse('No agents assigned to user', 400);
    }

    // Get retell agent IDs for this user
    const retellAgentIds = userAgents
      .map(ua => ua.agents.retell_agent_id)
      .filter(id => id); // Filter out null/undefined values

    if (retellAgentIds.length === 0) {
      console.log("[SYNC-CALLS] No Retell agents configured");
      return createErrorResponse('No Retell agents configured for assigned agents', 400);
    }

    console.log(`[SYNC-CALLS] Found ${retellAgentIds.length} Retell agent IDs: ${retellAgentIds.join(', ')}`);

    // Fetch calls from Retell AI
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    if (!retellApiKey) {
      console.error("[SYNC-CALLS ERROR] RETELL_API_KEY not configured");
      return createErrorResponse('RETELL_API_KEY not configured', 500);
    }

    console.log(`[SYNC-CALLS] Fetching calls from Retell AI`);

    const retellResponse = await fetch('https://api.retellai.com/v1/calls', {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!retellResponse.ok) {
      console.error('[SYNC-CALLS ERROR] Retell API error:', retellResponse.status, retellResponse.statusText);
      const errorText = await retellResponse.text();
      console.error('[SYNC-CALLS ERROR] Retell API response:', errorText);
      return createErrorResponse(`Retell API error: ${retellResponse.statusText}`, 500);
    }

    const retellData = await retellResponse.json();
    console.log(`[SYNC-CALLS] Fetched ${retellData.calls?.length || 0} calls from Retell AI`);

    if (!retellData.calls || !Array.isArray(retellData.calls)) {
      console.error('[SYNC-CALLS ERROR] Invalid response format from Retell API');
      return createErrorResponse('Invalid response format from Retell API', 500);
    }

    // Filter calls to only include those from user's assigned agents
    const userCalls = retellData.calls.filter((call: any) => 
      retellAgentIds.includes(call.agent_id)
    );

    console.log(`[SYNC-CALLS] Found ${userCalls.length} calls for user's assigned agents`);

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each call
    for (const retellCall of userCalls) {
      try {
        console.log(`[SYNC-CALLS] Processing call: ${retellCall.call_id}`);

        // Find the corresponding agent in our database
        const agentMapping = userAgents.find(ua => 
          ua.agents.retell_agent_id === retellCall.agent_id
        );

        if (!agentMapping) {
          skippedCount++;
          const error = `No agent mapping found for retell_agent_id: ${retellCall.agent_id}`;
          errors.push(error);
          console.warn(`[SYNC-CALLS WARN] ${error}`);
          continue;
        }

        // Map the Retell call data to our schema
        const mappedCallData = mapRetellCallToDatabase(
          retellCall as RetellCallData,
          user.id,
          companyId,
          agentMapping.agent_id,
          agentMapping.agents.rate_per_minute || 0.02
        );

        // Validate the mapped data
        const validationErrors = validateCallData(mappedCallData);
        if (validationErrors.length > 0) {
          skippedCount++;
          const error = `Invalid call data for ${retellCall.call_id}: ${validationErrors.join(', ')}`;
          errors.push(error);
          console.error(`[SYNC-CALLS ERROR] ${error}`);
          continue;
        }

        // Check if call already exists
        const { data: existingCall, error: checkError } = await supabaseClient
          .from("calls")
          .select('id')
          .eq("call_id", retellCall.call_id)
          .maybeSingle();

        if (checkError) {
          console.error('[SYNC-CALLS ERROR] Error checking existing call:', checkError);
          skippedCount++;
          errors.push(`Error checking call ${retellCall.call_id}: ${checkError.message}`);
          continue;
        }

        // Insert or update the call
        const { error: upsertError } = await supabaseClient
          .from("calls")
          .upsert(mappedCallData, { 
            onConflict: 'call_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('[SYNC-CALLS ERROR] Error upserting call:', upsertError);
          errors.push(`Failed to upsert call ${retellCall.call_id}: ${upsertError.message}`);
          skippedCount++;
        } else {
          if (existingCall) {
            updatedCount++;
            console.log(`[SYNC-CALLS] Updated existing call ${retellCall.call_id}`);
          } else {
            insertedCount++;
            console.log(`[SYNC-CALLS] Inserted new call ${retellCall.call_id}`);
            
            // Create transaction for new calls only
            if (mappedCallData.cost_usd > 0) {
              const { error: transactionError } = await supabaseClient
                .from('transactions')
                .insert({
                  user_id: user.id,
                  company_id: companyId,
                  amount: -mappedCallData.cost_usd,
                  transaction_type: 'call_cost',
                  description: `Call cost for ${mappedCallData.call_id}`,
                  call_id: mappedCallData.call_id
                });
                
              if (transactionError) {
                console.error('[SYNC-CALLS WARN] Failed to create transaction:', transactionError);
              }
            }
          }
        }

      } catch (error) {
        console.error('[SYNC-CALLS ERROR] Error processing call:', error);
        errors.push(`Error processing call ${retellCall.call_id}: ${error.message}`);
        skippedCount++;
      }
    }

    // Get updated call count for this user
    const { data: allCalls, error: callsError } = await supabaseClient
      .from("calls")
      .select('id')
      .eq("company_id", companyId);

    const totalCalls = allCalls?.length || 0;

    console.log(`[SYNC-CALLS] Sync completed: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${totalCalls} total calls`);

    return createSuccessResponse({
      success: true,
      totalFetched: userCalls.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      totalCalls: totalCalls,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully synced ${insertedCount + updatedCount} calls from Retell AI`,
      retellAgentsFound: retellAgentIds.length,
      userAgentsCount: userAgents.length
    });

  } catch (error) {
    console.error("[SYNC-CALLS FATAL ERROR] Error in sync-calls function:", error);
    return createErrorResponse("Internal server error", 500, error.message);
  }
});
