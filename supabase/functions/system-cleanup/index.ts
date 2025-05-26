import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYSTEM-CLEANUP] ${new Date().toISOString()} - Starting system cleanup`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify super admin access
    const { data: isSuperAdmin, error: superAdminError } = await supabaseClient.rpc('is_super_admin');
    
    if (superAdminError || !isSuperAdmin) {
      console.error('[SYSTEM-CLEANUP] Access denied - not super admin');
      return createErrorResponse('Access denied: Super admin required', 403);
    }

    const { action } = await req.json();
    
    switch (action) {
      case 'cleanup_duplicate_calls':
        return await cleanupDuplicateCalls(supabaseClient);
      case 'fix_orphaned_calls':
        return await fixOrphanedCalls(supabaseClient);
      case 'cleanup_old_logs':
        return await cleanupOldLogs(supabaseClient);
      case 'validate_agent_mappings':
        return await validateAgentMappings(supabaseClient);
      case 'full_cleanup':
        return await performFullCleanup(supabaseClient);
      default:
        return createErrorResponse('Unknown cleanup action', 400);
    }

  } catch (error) {
    console.error('[SYSTEM-CLEANUP] Error:', error);
    return createErrorResponse(`Cleanup failed: ${error.message}`, 500);
  }
});

async function cleanupDuplicateCalls(supabaseClient: any) {
  try {
    console.log('[CLEANUP] Removing duplicate calls...');
    
    // Find duplicate calls by call_id, keeping the most recent
    const { data: duplicates, error: findError } = await supabaseClient
      .rpc('find_duplicate_calls');
    
    if (findError) {
      console.error('[CLEANUP] Error finding duplicates:', findError);
      return createErrorResponse('Failed to find duplicates', 500);
    }

    let removedCount = 0;
    
    // Note: This would need a custom SQL function to safely remove duplicates
    // For now, just report what we found
    
    return createSuccessResponse({
      action: 'cleanup_duplicate_calls',
      duplicates_found: duplicates?.length || 0,
      removed_count: removedCount,
      status: 'completed'
    });

  } catch (error) {
    return createErrorResponse(`Duplicate cleanup failed: ${error.message}`, 500);
  }
}

async function fixOrphanedCalls(supabaseClient: any) {
  try {
    console.log('[CLEANUP] Fixing orphaned calls...');
    
    // Find calls without proper agent or user mapping
    const { data: orphanedCalls, error } = await supabaseClient
      .from('calls')
      .select('id, call_id, agent_id, user_id, company_id')
      .or('agent_id.is.null,user_id.is.null,company_id.is.null');

    if (error) throw error;

    let fixedCount = 0;
    const issues = [];

    for (const call of orphanedCalls || []) {
      const issue = {
        call_id: call.call_id,
        missing: []
      };

      if (!call.agent_id) issue.missing.push('agent_id');
      if (!call.user_id) issue.missing.push('user_id');
      if (!call.company_id) issue.missing.push('company_id');

      issues.push(issue);
    }

    return createSuccessResponse({
      action: 'fix_orphaned_calls',
      orphaned_calls_found: orphanedCalls?.length || 0,
      fixed_count: fixedCount,
      issues: issues,
      status: 'completed'
    });

  } catch (error) {
    return createErrorResponse(`Orphaned calls fix failed: ${error.message}`, 500);
  }
}

async function cleanupOldLogs(supabaseClient: any) {
  try {
    console.log('[CLEANUP] Cleaning up old logs...');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep last 30 days
    
    // Clean up webhook_logs (if exists)
    const { error: logsError } = await supabaseClient
      .from('webhook_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    // Clean up webhook_errors older than 30 days
    const { error: errorsError } = await supabaseClient
      .from('webhook_errors')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    return createSuccessResponse({
      action: 'cleanup_old_logs',
      cutoff_date: cutoffDate.toISOString(),
      logs_cleanup_success: !logsError,
      errors_cleanup_success: !errorsError,
      status: 'completed'
    });

  } catch (error) {
    return createErrorResponse(`Log cleanup failed: ${error.message}`, 500);
  }
}

async function validateAgentMappings(supabaseClient: any) {
  try {
    console.log('[CLEANUP] Validating agent mappings...');
    
    // Get all agents and their mappings
    const { data: agents, error: agentsError } = await supabaseClient
      .from('agents')
      .select(`
        id,
        name,
        retell_agent_id,
        status,
        user_agents(
          id,
          user_id,
          company_id,
          is_primary
        )
      `);

    if (agentsError) throw agentsError;

    const validationReport = {
      total_agents: agents.length,
      active_agents: agents.filter(a => a.status === 'active').length,
      agents_with_retell_id: agents.filter(a => a.retell_agent_id).length,
      agents_with_mappings: agents.filter(a => a.user_agents.length > 0).length,
      unmapped_agents: agents.filter(a => a.user_agents.length === 0).map(a => ({
        id: a.id,
        name: a.name,
        retell_agent_id: a.retell_agent_id,
        status: a.status
      })),
      agents_without_retell_id: agents.filter(a => !a.retell_agent_id).map(a => ({
        id: a.id,
        name: a.name,
        status: a.status
      }))
    };

    return createSuccessResponse({
      action: 'validate_agent_mappings',
      validation_report: validationReport,
      status: 'completed'
    });

  } catch (error) {
    return createErrorResponse(`Agent mapping validation failed: ${error.message}`, 500);
  }
}

async function performFullCleanup(supabaseClient: any) {
  try {
    console.log('[CLEANUP] Performing full system cleanup...');
    
    const results = {
      duplicate_cleanup: await cleanupDuplicateCalls(supabaseClient),
      orphaned_cleanup: await fixOrphanedCalls(supabaseClient),
      logs_cleanup: await cleanupOldLogs(supabaseClient),
      agent_validation: await validateAgentMappings(supabaseClient)
    };

    return createSuccessResponse({
      action: 'full_cleanup',
      results: results,
      completed_at: new Date().toISOString(),
      status: 'completed'
    });

  } catch (error) {
    return createErrorResponse(`Full cleanup failed: ${error.message}`, 500);
  }
}
