
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders } from "../_shared/cors.ts";
import { processWebhookEvent, handleTransactionAndBalance, logWebhookResult } from "../_shared/retellEventProcessor.ts";
import { processCallCredits } from "../_shared/creditProcessor.ts";

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[WEBHOOK] Received ${req.method} request`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const body = await req.json();
    console.log(`[WEBHOOK] Processing event: ${body.event}`);

    const { event, call } = body;
    const callId = call?.call_id;

    if (!callId) {
      console.error('[WEBHOOK] No call_id found in webhook payload');
      return new Response('Bad request: missing call_id', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Process the webhook event
    const processedData = processWebhookEvent(event, call);
    
    // Find the agent mapping
    const { data: agent, error: agentError } = await supabase
      .from('retell_agents')
      .select('*')
      .eq('agent_id', call.agent_id)
      .single();

    if (agentError || !agent) {
      console.error(`[WEBHOOK] Agent not found for agent_id: ${call.agent_id}`);
      return new Response('Agent not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Find user assignment
    const { data: userAgent, error: userAgentError } = await supabase
      .from('user_agent_assignments')
      .select('user_id, company_id')
      .eq('agent_id', agent.id)
      .eq('is_primary', true)
      .single();

    if (userAgentError || !userAgent) {
      console.error(`[WEBHOOK] User assignment not found for agent: ${agent.id}`);
      return new Response('User assignment not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Store/update call data
    const callData = {
      call_id: callId,
      user_id: userAgent.user_id,
      company_id: userAgent.company_id,
      agent_id: agent.id,
      timestamp: call.start_timestamp || new Date().toISOString(),
      duration_sec: call.duration_sec || 0,
      cost_usd: call.cost_usd || 0,
      call_status: processedData.call_status,
      from: call.from_number || 'unknown',
      to: call.to_number || 'unknown',
      disconnection_reason: call.disconnection_reason,
      transcript: call.transcript,
      sentiment: call.sentiment,
      recording_url: call.recording_url
    };

    const { error: upsertError } = await supabase
      .from('retell_calls')
      .upsert(callData, { onConflict: 'call_id' });

    if (upsertError) {
      console.error('[WEBHOOK] Error upserting call data:', upsertError);
      await logWebhookResult(supabase, event, callId, agent, userAgent, callData, 'failed', startTime);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Process credits for completed calls
    if (event === 'call_ended' && call.cost_usd > 0) {
      console.log(`[WEBHOOK] Processing credits for completed call: ${callId}`);
      
      const creditResult = await processCallCredits(
        supabase,
        call,
        userAgent.user_id
      );

      if (creditResult.error) {
        console.error(`[WEBHOOK] Credit processing failed:`, creditResult.error);
        // Don't fail the webhook if credit processing fails
      } else if (creditResult.success) {
        console.log(`[WEBHOOK] Credits processed successfully. New balance: $${creditResult.newBalance}`);
        
        // Log balance warnings
        if (creditResult.wasBlocked) {
          console.warn(`[WEBHOOK] User account blocked due to insufficient funds: ${userAgent.user_id}`);
        } else if (creditResult.isCritical) {
          console.warn(`[WEBHOOK] User has critical low balance: ${userAgent.user_id}`);
        } else if (creditResult.isLow) {
          console.warn(`[WEBHOOK] User has low balance: ${userAgent.user_id}`);
        }
      }
    }

    // Handle transaction and balance (existing logic)
    await handleTransactionAndBalance(supabase, event, call, userAgent);

    // Log successful webhook processing
    await logWebhookResult(supabase, event, callId, agent, userAgent, callData, 'success', startTime);

    console.log(`[WEBHOOK] Successfully processed ${event} for call ${callId}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      event, 
      call_id: callId 
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
});
