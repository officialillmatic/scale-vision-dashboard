
import { createErrorResponse } from './corsUtils.ts';

export async function findAgentInDatabase(supabaseClient: any, retellAgentId: string) {
  console.log(`[DB-OPS] Looking up agent with retell_agent_id: ${retellAgentId}`);
  
  try {
    const { data: agent, error } = await supabaseClient
      .from('agents')
      .select('id, name, rate_per_minute')
      .eq('retell_agent_id', retellAgentId)
      .single();

    if (error) {
      console.error(`[DB-OPS] Agent lookup error:`, error);
      return { 
        agent: null, 
        error: createErrorResponse(`Agent not found for retell_agent_id: ${retellAgentId}`, 404) 
      };
    }

    if (!agent) {
      console.error(`[DB-OPS] No agent found for retell_agent_id: ${retellAgentId}`);
      return { 
        agent: null, 
        error: createErrorResponse(`Agent not found for retell_agent_id: ${retellAgentId}`, 404) 
      };
    }

    console.log(`[DB-OPS] Found agent: ${agent.name} (ID: ${agent.id})`);
    return { agent, error: null };

  } catch (error: any) {
    console.error(`[DB-OPS] Database error during agent lookup:`, error);
    return { 
      agent: null, 
      error: createErrorResponse(`Database error: ${error.message}`, 500) 
    };
  }
}

export async function findUserAgentMapping(supabaseClient: any, agentId: string) {
  console.log(`[DB-OPS] Looking up user agent mapping for agent_id: ${agentId}`);
  
  try {
    const { data: userAgents, error } = await supabaseClient
      .from('user_agents')
      .select('user_id, company_id')
      .eq('agent_id', agentId);

    if (error) {
      console.error(`[DB-OPS] User agent mapping error:`, error);
      return { 
        userAgent: null, 
        error: createErrorResponse(`Failed to find user mapping for agent: ${error.message}`, 500) 
      };
    }

    if (!userAgents || userAgents.length === 0) {
      console.error(`[DB-OPS] No user mapping found for agent_id: ${agentId}`);
      return { 
        userAgent: null, 
        error: createErrorResponse(`No user mapping found for agent_id: ${agentId}. Please ensure the agent is properly assigned to a user.`, 404) 
      };
    }

    // Use the first mapping if multiple exist
    const userAgent = userAgents[0];
    console.log(`[DB-OPS] Found user mapping: user_id=${userAgent.user_id}, company_id=${userAgent.company_id}`);
    
    return { userAgent, error: null };

  } catch (error: any) {
    console.error(`[DB-OPS] Database error during user agent mapping lookup:`, error);
    return { 
      userAgent: null, 
      error: createErrorResponse(`Database error: ${error.message}`, 500) 
    };
  }
}

export async function upsertCallData(supabaseClient: any, callData: any) {
  console.log(`[DB-OPS] Upserting call data for call_id: ${callData.call_id}`);
  
  try {
    const { data: upsertedCall, error } = await supabaseClient
      .from('calls')
      .upsert(callData, {
        onConflict: 'call_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error(`[DB-OPS] Call upsert error:`, error);
      return { 
        upsertedCall: null, 
        error: createErrorResponse(`Failed to save call data: ${error.message}`, 500) 
      };
    }

    console.log(`[DB-OPS] Successfully upserted call: ${callData.call_id} (DB ID: ${upsertedCall?.id})`);
    return { upsertedCall, error: null };

  } catch (error: any) {
    console.error(`[DB-OPS] Database error during call upsert:`, error);
    return { 
      upsertedCall: null, 
      error: createErrorResponse(`Database error: ${error.message}`, 500) 
    };
  }
}
