
import { createSuccessResponse } from './corsUtils.ts';

export async function performHealthCheck(supabaseClient: any, retellSecret: string | undefined) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'checking...',
      webhook_endpoint: 'active',
      retell_integration: 'checking...',
      retell_secret_configured: Boolean(retellSecret)
    }
  };

  // Test database connectivity
  try {
    const { data: dbTest, error: dbError } = await supabaseClient
      .from('agents')
      .select('count')
      .limit(1);
    
    healthCheck.services.database = dbError ? 'error' : 'healthy';
  } catch (e) {
    healthCheck.services.database = 'error';
  }

  // Test Retell integration (basic check)
  try {
    const { data: agentCount } = await supabaseClient
      .from('agents')
      .select('count', { count: 'exact' })
      .not('retell_agent_id', 'is', null);
    
    healthCheck.services.retell_integration = agentCount ? 'healthy' : 'no_agents';
  } catch (e) {
    healthCheck.services.retell_integration = 'error';
  }

  return createSuccessResponse(healthCheck);
}
