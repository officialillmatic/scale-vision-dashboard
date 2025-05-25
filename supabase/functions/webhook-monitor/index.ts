
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-MONITOR] Received ${req.method} request`);

  // Accept both GET and POST methods for monitoring
  if (req.method !== 'GET' && req.method !== 'POST') {
    console.error(`[WEBHOOK-MONITOR] Invalid method: ${req.method}`);
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get calls from the last hour to check webhook activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    console.log(`[WEBHOOK-MONITOR] Checking calls since: ${oneHourAgo}`);
    
    const { data: recentCalls, error: callsError } = await supabaseClient
      .from('calls')
      .select('call_id, call_status, timestamp, start_time, duration_sec, cost_usd, agent_id')
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (callsError) {
      console.error('[WEBHOOK-MONITOR ERROR] Error fetching recent calls:', callsError);
      return createErrorResponse('Failed to fetch webhook activity', 500);
    }

    // Get the most recent call to determine last activity
    const { data: lastCall, error: lastCallError } = await supabaseClient
      .from('calls')
      .select('timestamp, start_time, call_status')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCallError) {
      console.error('[WEBHOOK-MONITOR ERROR] Error fetching last call:', lastCallError);
    }

    const lastActivity = lastCall?.timestamp || lastCall?.start_time || null;
    const lastHourCount = recentCalls?.length || 0;
    const recentActivityCount = recentCalls?.filter(call => 
      call.timestamp >= thirtyMinutesAgo || call.start_time >= thirtyMinutesAgo
    ).length || 0;
    
    // Determine webhook health status
    const isActive = recentActivityCount > 0 && lastActivity && 
      (new Date(lastActivity).getTime() > Date.now() - 30 * 60 * 1000);

    // Calculate metrics from recent calls
    const totalCost = recentCalls?.reduce((sum, call) => sum + (call.cost_usd || 0), 0) || 0;
    const avgDuration = recentCalls?.length > 0 
      ? recentCalls.reduce((sum, call) => sum + (call.duration_sec || 0), 0) / recentCalls.length 
      : 0;

    // Get agent usage statistics
    const agentStats = recentCalls?.reduce((acc, call) => {
      if (call.agent_id) {
        acc[call.agent_id] = (acc[call.agent_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const webhookHealth = {
      last_hour_count: lastHourCount,
      last_30min_count: recentActivityCount,
      status: isActive ? 'active' : 'inactive',
      last_activity: lastActivity,
      total_cost_last_hour: totalCost.toFixed(4),
      avg_duration_sec: Math.round(avgDuration),
      health_score: isActive ? (recentActivityCount > 5 ? 'excellent' : 'good') : 'poor',
      agent_usage: agentStats
    };

    const recentActivity = (recentCalls || []).slice(0, 20).map(call => ({
      call_id: call.call_id,
      timestamp: call.timestamp || call.start_time,
      call_status: call.call_status,
      duration_sec: call.duration_sec,
      cost_usd: call.cost_usd,
      agent_id: call.agent_id,
      event_type: 'webhook_received'
    }));

    // Enhanced webhook endpoints health check
    const webhookEndpoints = {
      retell_webhook: {
        path: '/functions/v1/retell-webhook',
        status: isActive ? 'active' : 'inactive',
        last_used: lastActivity,
        method: 'POST'
      },
      webhook_test: {
        path: '/functions/v1/webhook-test',
        status: 'available',
        method: 'POST'
      },
      webhook_monitor: {
        path: '/functions/v1/webhook-monitor',
        status: 'active',
        method: 'GET|POST'
      },
      sync_calls: {
        path: '/functions/v1/sync-calls',
        status: 'available',
        method: 'POST'
      }
    };

    const monitorData = {
      webhook_health: webhookHealth,
      recent_activity: recentActivity,
      timestamp: new Date().toISOString(),
      webhook_endpoints: webhookEndpoints,
      system_info: {
        monitoring_window: '1 hour',
        activity_threshold: '30 minutes',
        total_endpoints: Object.keys(webhookEndpoints).length,
        data_points_analyzed: lastHourCount
      }
    };

    console.log(`[WEBHOOK-MONITOR] Health check completed:`, {
      status: webhookHealth.status,
      last_hour_calls: lastHourCount,
      recent_calls: recentActivityCount,
      health_score: webhookHealth.health_score,
      agents_active: Object.keys(agentStats).length
    });

    return createSuccessResponse(monitorData);

  } catch (error) {
    console.error('[WEBHOOK-MONITOR FATAL ERROR] Webhook monitor error:', error);
    return createErrorResponse(`Internal server error: ${error.message}`, 500);
  }
});
