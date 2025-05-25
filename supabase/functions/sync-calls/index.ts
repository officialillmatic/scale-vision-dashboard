
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { validateAuth, getUserCompany, checkCompanyAccess } from "../_shared/authUtils.ts";
import { getUserBalance, updateUserBalance, recordTransactions } from "../_shared/userBalanceUtils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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
      console.error("Error fetching user agents:", userAgentsError);
      return createErrorResponse('Error fetching user agent data', 500);
    }

    if (!userAgents || userAgents.length === 0) {
      return createErrorResponse('No agents assigned to user', 400);
    }

    // Get retell agent IDs for this user
    const retellAgentIds = userAgents
      .map(ua => ua.agents.retell_agent_id)
      .filter(id => id); // Filter out null/undefined values

    if (retellAgentIds.length === 0) {
      return createErrorResponse('No Retell agents configured for assigned agents', 400);
    }

    const primaryAgent = userAgents.find(ua => ua.is_primary)?.agents;
    const primaryAgentId = primaryAgent?.id;

    // Fetch calls from Retell AI
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    if (!retellApiKey) {
      return createErrorResponse('RETELL_API_KEY not configured', 500);
    }

    console.log(`Fetching calls from Retell AI for agents: ${retellAgentIds.join(', ')}`);

    const retellResponse = await fetch('https://api.retellai.com/v1/calls', {
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!retellResponse.ok) {
      console.error('Retell API error:', retellResponse.status, retellResponse.statusText);
      return createErrorResponse(`Retell API error: ${retellResponse.statusText}`, 500);
    }

    const retellData = await retellResponse.json();
    console.log(`Fetched ${retellData.calls?.length || 0} calls from Retell AI`);

    // Filter calls to only include those from user's assigned agents
    const userCalls = retellData.calls?.filter((call: any) => 
      retellAgentIds.includes(call.agent_id)
    ) || [];

    console.log(`Found ${userCalls.length} calls for user's assigned agents`);

    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each call
    for (const retellCall of userCalls) {
      try {
        // Find the corresponding agent in our database
        const agentMapping = userAgents.find(ua => 
          ua.agents.retell_agent_id === retellCall.agent_id
        );

        if (!agentMapping) {
          skippedCount++;
          errors.push(`No agent mapping found for retell_agent_id: ${retellCall.agent_id}`);
          continue;
        }

        // Calculate cost based on duration and agent rate
        const durationMinutes = (retellCall.duration || 0) / 60;
        const ratePerMinute = agentMapping.agents.rate_per_minute || 0.02;
        const cost = durationMinutes * ratePerMinute;

        // Prepare call data for insertion
        const callData = {
          call_id: retellCall.call_id,
          user_id: user.id,
          company_id: companyId,
          agent_id: agentMapping.agent_id,
          from_number: retellCall.from_number || 'unknown',
          to_number: retellCall.to_number || 'unknown',
          from: retellCall.from_number || 'unknown', // Keep for backward compatibility
          to: retellCall.to_number || 'unknown', // Keep for backward compatibility
          duration_sec: retellCall.duration || 0,
          start_time: retellCall.start_time || new Date().toISOString(),
          timestamp: retellCall.start_time || new Date().toISOString(), // Keep for backward compatibility
          recording_url: retellCall.recording_url,
          transcript_url: retellCall.transcript_url,
          transcript: retellCall.transcript,
          sentiment_score: retellCall.sentiment_score,
          sentiment: retellCall.sentiment || 'neutral',
          disposition: retellCall.disposition,
          call_status: retellCall.call_status || 'completed',
          call_type: 'phone_call',
          cost_usd: cost,
          audio_url: retellCall.recording_url // Keep for backward compatibility
        };

        // Insert or update the call
        const { error: insertError } = await supabaseClient
          .from("calls")
          .upsert(callData, { 
            onConflict: 'call_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error('Error inserting call:', insertError);
          errors.push(`Failed to insert call ${retellCall.call_id}: ${insertError.message}`);
          skippedCount++;
        } else {
          insertedCount++;
          console.log(`Successfully processed call ${retellCall.call_id}`);
        }

      } catch (error) {
        console.error('Error processing call:', error);
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

    console.log(`Sync completed: ${insertedCount} inserted, ${skippedCount} skipped, ${totalCalls} total calls`);

    return createSuccessResponse({
      success: true,
      totalFetched: userCalls.length,
      inserted: insertedCount,
      skipped: skippedCount,
      totalCalls: totalCalls,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully synced ${insertedCount} calls from Retell AI`,
      retellAgentsFound: retellAgentIds.length,
      userAgentsCount: userAgents.length
    });

  } catch (error) {
    console.error("Error in sync-calls function:", error);
    return createErrorResponse("Internal server error", 500, error.message);
  }
});
