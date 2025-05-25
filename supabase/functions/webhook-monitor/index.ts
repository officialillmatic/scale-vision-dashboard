
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WebhookHealth {
  status: 'active' | 'inactive' | 'error';
  last_hour_calls: number;
  recent_calls: number;
  health_score: 'excellent' | 'good' | 'poor';
  agents_active: number;
  last_webhook_time?: string;
  error_rate?: number;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-MONITOR] Received ${req.method} request`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current time and time thresholds
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    console.log(`[WEBHOOK-MONITOR] Checking calls since: ${oneHourAgo.toISOString()}`);

    // Get recent call activity
    const { data: recentCalls, error: callsError } = await supabaseClient
      .from('calls')
      .select('id, timestamp, call_status, agent_id')
      .gte('timestamp', oneHourAgo.toISOString())
      .order('timestamp', { ascending: false });

    if (callsError) {
      console.error('[WEBHOOK-MONITOR] Error fetching calls:', callsError);
      return createSuccessResponse({
        status: 'error',
        error: callsError.message,
        timestamp: now.toISOString()
      });
    }

    // Get active agents count
    const { data: activeAgents, error: agentsError } = await supabaseClient
      .from('agents')
      .select('id')
      .eq('status', 'active');

    const agentsActive = activeAgents?.length || 0;

    // Calculate metrics
    const lastHourCalls = recentCalls?.length || 0;
    const recentCallsCount = recentCalls?.filter(call => 
      new Date(call.timestamp) >= fiveMinutesAgo
    ).length || 0;

    // Find the most recent call
    const lastWebhookTime = recentCalls?.[0]?.timestamp;

    // Determine health status
    let status: 'active' | 'inactive' | 'error' = 'inactive';
    let healthScore: 'excellent' | 'good' | 'poor' = 'poor';

    if (lastHourCalls > 10) {
      status = 'active';
      healthScore = 'excellent';
    } else if (lastHourCalls > 0) {
      status = 'active';
      healthScore = 'good';
    } else {
      status = 'inactive';
      healthScore = 'poor';
    }

    const health: WebhookHealth = {
      status,
      last_hour_calls: lastHourCalls,
      recent_calls: recentCallsCount,
      health_score: healthScore,
      agents_active: agentsActive,
      last_webhook_time: lastWebhookTime || undefined
    };

    console.log(`[WEBHOOK-MONITOR] Health check completed:`, health);

    return createSuccessResponse({
      ...health,
      timestamp: now.toISOString(),
      monitoring_window: '1 hour',
      recent_window: '5 minutes'
    });

  } catch (error) {
    console.error('[WEBHOOK-MONITOR] Error:', error);
    return createSuccessResponse({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
