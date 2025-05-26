
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-MONITOR] ${new Date().toISOString()} - Health check request`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Simple database connectivity test
    const { data: dbTest, error: dbError } = await supabaseClient
      .from('agents')
      .select('count', { count: 'exact', head: true });

    if (dbError) {
      console.error('[WEBHOOK-MONITOR] Database connectivity error:', dbError);
      return createErrorResponse(`Database error: ${dbError.message}`, 500);
    }

    // Get webhook activity data
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Check calls in the last hour
    const { count: lastHourCalls, error: hourError } = await supabaseClient
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', oneHourAgo);

    // Check calls in the last 5 minutes
    const { count: recentCalls, error: recentError } = await supabaseClient
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', fiveMinutesAgo);

    // Count active agents
    const { count: activeAgents, error: agentsError } = await supabaseClient
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get the most recent call timestamp
    const { data: latestCall, error: latestError } = await supabaseClient
      .from('calls')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hourError || recentError || agentsError) {
      console.error('[WEBHOOK-MONITOR] Database query errors:', { hourError, recentError, agentsError });
    }

    // Determine webhook status
    let status: 'active' | 'inactive' | 'error' = 'inactive';
    let healthScore: 'excellent' | 'good' | 'poor' = 'poor';

    if (recentCalls && recentCalls > 0) {
      status = 'active';
      healthScore = 'excellent';
    } else if (lastHourCalls && lastHourCalls > 0) {
      status = 'inactive';
      healthScore = 'good';
    } else {
      status = 'inactive';
      healthScore = 'poor';
    }

    const response = {
      status,
      last_hour_calls: lastHourCalls || 0,
      recent_calls: recentCalls || 0,
      health_score: healthScore,
      agents_active: activeAgents || 0,
      last_webhook_time: latestCall?.timestamp || null,
      timestamp: new Date().toISOString(),
      database_healthy: !dbError
    };

    console.log(`[WEBHOOK-MONITOR] Health check result:`, response);

    return createSuccessResponse(response);

  } catch (error) {
    console.error('[WEBHOOK-MONITOR] Fatal error:', error);
    return createErrorResponse(`Health check failed: ${error.message}`, 500);
  }
});
