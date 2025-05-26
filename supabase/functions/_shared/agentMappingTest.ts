
import { createErrorResponse, createSuccessResponse } from './corsUtils.ts';

export async function testAgentMapping(supabaseClient: any, payload: any) {
  try {
    console.log('[WEBHOOK-TEST] Testing agent mapping...');
    
    const { data: agents, error } = await supabaseClient
      .from('agents')
      .select(`
        id,
        name,
        retell_agent_id,
        status,
        user_agents!inner(
          user_id,
          company_id,
          is_primary
        )
      `)
      .eq('status', 'active');

    if (error) throw error;

    const mappingReport = {
      total_agents: agents.length,
      agents_with_retell_id: agents.filter(a => a.retell_agent_id).length,
      agents_with_user_mapping: agents.filter(a => a.user_agents.length > 0).length,
      ready_for_webhooks: agents.filter(a => a.retell_agent_id && a.user_agents.length > 0).length,
      agent_details: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        retell_agent_id: agent.retell_agent_id,
        has_user_mapping: agent.user_agents.length > 0,
        user_count: agent.user_agents.length,
        webhook_ready: Boolean(agent.retell_agent_id && agent.user_agents.length > 0)
      }))
    };

    return createSuccessResponse(mappingReport);

  } catch (error) {
    return createErrorResponse(`Agent mapping test failed: ${error.message}`, 500);
  }
}
