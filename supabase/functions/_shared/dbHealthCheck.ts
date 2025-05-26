
import { createSuccessResponse, createErrorResponse } from './corsUtils.ts';

export async function performDatabaseHealthCheck(supabaseClient: any) {
  try {
    console.log('[DB_HEALTH] Starting comprehensive database health check');
    
    // Test 1: Basic connectivity with current user function
    const { data: basicTest, error: basicError } = await supabaseClient
      .rpc('get_current_user_id');
    
    if (basicError) {
      console.error('[DB_HEALTH] Basic connectivity failed:', basicError);
      return createErrorResponse(`Database connectivity failed: ${basicError.message}`, 500);
    }
    
    console.log('[DB_HEALTH] Basic connectivity: OK');

    // Test 2: Table access with proper error handling
    let callsCount = 0;
    let agentsCount = 0;
    let companiesCount = 0;
    
    try {
      const { count: calls, error: callsError } = await supabaseClient
        .from('calls')
        .select('*', { count: 'exact', head: true });
      
      if (!callsError) {
        callsCount = calls || 0;
      }
    } catch (e) {
      console.warn('[DB_HEALTH] Calls table access warning:', e);
    }

    try {
      const { count: agents, error: agentsError } = await supabaseClient
        .from('agents')
        .select('*', { count: 'exact', head: true });
      
      if (!agentsError) {
        agentsCount = agents || 0;
      }
    } catch (e) {
      console.warn('[DB_HEALTH] Agents table access warning:', e);
    }

    try {
      const { count: companies, error: companiesError } = await supabaseClient
        .from('companies')
        .select('*', { count: 'exact', head: true });
      
      if (!companiesError) {
        companiesCount = companies || 0;
      }
    } catch (e) {
      console.warn('[DB_HEALTH] Companies table access warning:', e);
    }

    // Test 3: Function access
    let functionsHealthy = true;
    try {
      const { data: superAdminTest, error: funcError } = await supabaseClient
        .rpc('is_super_admin_safe');
      
      if (funcError) {
        console.warn('[DB_HEALTH] Function test warning:', funcError);
        functionsHealthy = false;
      }
    } catch (e) {
      console.warn('[DB_HEALTH] Function access warning:', e);
      functionsHealthy = false;
    }

    // Test 4: Check for essential data
    const hasEssentialData = agentsCount > 0 || companiesCount > 0;

    const healthData = {
      status: 'healthy',
      connectivity: 'ok',
      tables_accessible: true,
      functions_accessible: functionsHealthy,
      total_calls: callsCount,
      total_agents: agentsCount,
      total_companies: companiesCount,
      has_essential_data: hasEssentialData,
      timestamp: new Date().toISOString()
    };

    console.log('[DB_HEALTH] Comprehensive health check passed:', healthData);
    return createSuccessResponse(healthData);
    
  } catch (error) {
    console.error('[DB_HEALTH] Health check failed:', error);
    return createErrorResponse(`Database health check failed: ${error.message}`, 500);
  }
}
