
import { createErrorResponse } from './corsUtils.ts';

export async function findAgentInDatabase(supabaseClient: any, retellAgentId: string) {
  console.log(`[WEBHOOK] Looking up agent with retell_agent_id: ${retellAgentId}`);

  const { data: agent, error: agentError } = await supabaseClient
    .from('agents')
    .select('id, name, rate_per_minute, status')
    .eq('retell_agent_id', retellAgentId)
    .eq('status', 'active')
    .single();

  if (agentError || !agent) {
    console.error('[WEBHOOK ERROR] Agent not found or inactive:', { 
      retell_agent_id: retellAgentId, 
      error: agentError 
    });
    
    // Log this for monitoring but don't fail completely
    try {
      await supabaseClient
        .from('webhook_errors')
        .insert({
          error_type: 'agent_not_found',
          retell_agent_id: retellAgentId,
          error_details: agentError?.message || 'Agent not found or inactive',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
      
    return { 
      agent: null, 
      error: createErrorResponse(`Agent not found or inactive for retell_agent_id: ${retellAgentId}`, 400) 
    };
  }

  console.log(`[WEBHOOK] Found agent:`, { id: agent.id, name: agent.name, status: agent.status });
  return { agent, error: null };
}

export async function findUserAgentMapping(supabaseClient: any, agentId: string) {
  const { data: userAgent, error: userAgentError } = await supabaseClient
    .from('user_agents')
    .select(`
      user_id, 
      company_id,
      is_primary,
      companies!inner(id, name, owner_id)
    `)
    .eq('agent_id', agentId)
    .single();

  if (userAgentError || !userAgent) {
    console.error('[WEBHOOK ERROR] User agent mapping not found:', { 
      agent_id: agentId, 
      error: userAgentError 
    });
    
    // Log for monitoring
    try {
      await supabaseClient
        .from('webhook_errors')
        .insert({
          error_type: 'user_mapping_not_found',
          agent_id: agentId,
          event_type: 'unknown',
          error_details: userAgentError?.message || 'User mapping not found',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
      
    return { 
      userAgent: null, 
      error: createErrorResponse(`User mapping not found for agent: ${agentId}`, 400) 
    };
  }

  console.log(`[WEBHOOK] Found user mapping:`, { 
    user_id: userAgent.user_id, 
    company_id: userAgent.company_id,
    company_name: userAgent.companies?.name
  });

  return { userAgent, error: null };
}

export async function upsertCallData(supabaseClient: any, finalCallData: any) {
  console.log(`[WEBHOOK] Upserting call data for call_id: ${finalCallData.call_id}`);
  
  const { data: upsertedCall, error: upsertError } = await supabaseClient
    .from('calls')
    .upsert(finalCallData, {
      onConflict: 'call_id',
      ignoreDuplicates: false
    })
    .select('id, call_id, cost_usd')
    .single();

  if (upsertError) {
    console.error('[WEBHOOK ERROR] Failed to upsert call data:', upsertError);
    console.error('[WEBHOOK ERROR] Call data that failed:', JSON.stringify(finalCallData, null, 2));
    
    // Log the upsert error for debugging
    try {
      await supabaseClient
        .from('webhook_errors')
        .insert({
          error_type: 'upsert_failed',
          call_id: finalCallData.call_id,
          error_details: upsertError.message,
          call_data: finalCallData,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log upsert error:', logError);
    }
    
    return { 
      upsertedCall: null, 
      error: createErrorResponse(`Failed to save call data: ${upsertError.message}`, 500) 
    };
  }

  console.log(`[WEBHOOK] Successfully upserted call with ID: ${upsertedCall?.id}`);
  return { upsertedCall, error: null };
}
