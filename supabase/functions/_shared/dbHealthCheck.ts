
import { createSuccessResponse, createErrorResponse } from './corsUtils.ts';

export async function performDatabaseHealthCheck(supabaseClient: any) {
  try {
    console.log('[DB_HEALTH] Starting database health check');
    
    // Basic connectivity test
    const { data: basicTest, error: basicError } = await supabaseClient
      .rpc('get_current_user_id'); // Use existing safe function
    
    if (basicError) {
      console.error('[DB_HEALTH] Basic connectivity failed:', basicError);
      return createErrorResponse(`Database connectivity failed: ${basicError.message}`, 500);
    }
    
    // Test table access
    const { count: callsCount, error: callsError } = await supabaseClient
      .from('calls')
      .select('*', { count: 'exact', head: true });
      
    const { count: agentsCount, error: agentsError } = await supabaseClient
      .from('agents')
      .select('*', { count: 'exact', head: true });

    if (callsError || agentsError) {
      console.error('[DB_HEALTH] Table access errors:', { callsError, agentsError });
      return createErrorResponse('Database table access failed', 500);
    }

    const healthData = {
      status: 'healthy',
      connectivity: 'ok',
      tables_accessible: true,
      total_calls: callsCount || 0,
      total_agents: agentsCount || 0,
      timestamp: new Date().toISOString()
    };

    console.log('[DB_HEALTH] Health check passed:', healthData);
    return createSuccessResponse(healthData);
    
  } catch (error) {
    console.error('[DB_HEALTH] Health check failed:', error);
    return createErrorResponse(`Database health check failed: ${error.message}`, 500);
  }
}
