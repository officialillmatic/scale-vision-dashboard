
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[SYSTEM-CLEANUP] ${new Date().toISOString()} - Cleanup request received`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    const cleanupResults = {
      expired_invitations: 0,
      old_webhook_logs: 0,
      old_rate_limits: 0,
      orphaned_records: 0,
      performance_data: null
    };

    // Clean up expired invitations
    const { count: expiredInvitations } = await supabaseClient
      .from('company_invitations')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('*', { count: 'exact', head: true });

    cleanupResults.expired_invitations = expiredInvitations || 0;

    // Clean up old webhook logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: oldWebhookLogs } = await supabaseClient
      .from('webhook_logs')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('*', { count: 'exact', head: true });

    cleanupResults.old_webhook_logs = oldWebhookLogs || 0;

    // Clean up old rate limit entries
    const { count: oldRateLimits } = await supabaseClient
      .from('rate_limits')
      .delete()
      .lt('reset_at', new Date().toISOString())
      .select('*', { count: 'exact', head: true });

    cleanupResults.old_rate_limits = oldRateLimits || 0;

    // Collect performance metrics
    const { data: performanceData } = await supabaseClient
      .from('performance_metrics')
      .select('*')
      .single();

    cleanupResults.performance_data = performanceData;

    console.log(`[SYSTEM-CLEANUP] Cleanup completed:`, cleanupResults);

    return createSuccessResponse({
      message: 'System cleanup completed successfully',
      results: cleanupResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SYSTEM-CLEANUP] Error:', error);
    return createErrorResponse(`Cleanup failed: ${error.message}`, 500);
  }
});
