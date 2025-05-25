
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get calls from the last hour to check webhook activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentCalls, error: callsError } = await supabaseClient
      .from('calls')
      .select('call_id, call_status, timestamp, start_time')
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (callsError) {
      console.error('Error fetching recent calls:', callsError);
      return createErrorResponse('Failed to fetch webhook activity', 500);
    }

    // Get the most recent call to determine last activity
    const { data: lastCall, error: lastCallError } = await supabaseClient
      .from('calls')
      .select('timestamp, start_time')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const lastActivity = lastCall?.timestamp || lastCall?.start_time || null;
    const lastHourCount = recentCalls?.length || 0;
    
    // Determine webhook health status
    const isActive = lastHourCount > 0 && lastActivity && 
      (new Date(lastActivity).getTime() > Date.now() - 30 * 60 * 1000); // Active if calls in last 30 minutes

    const webhookHealth = {
      last_hour_count: lastHourCount,
      status: isActive ? 'active' : 'inactive',
      last_activity: lastActivity
    };

    const recentActivity = (recentCalls || []).map(call => ({
      call_id: call.call_id,
      timestamp: call.timestamp || call.start_time,
      call_status: call.call_status,
      event_type: 'webhook_received'
    }));

    const monitorData = {
      webhook_health: webhookHealth,
      recent_activity: recentActivity,
      timestamp: new Date().toISOString(),
      webhook_endpoints: {
        retell_webhook: '/functions/v1/retell-webhook',
        webhook_test: '/functions/v1/webhook-test',
        webhook_monitor: '/functions/v1/webhook-monitor'
      }
    };

    console.log('Webhook monitor data:', JSON.stringify(monitorData, null, 2));

    return createSuccessResponse(monitorData);

  } catch (error) {
    console.error('Webhook monitor error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
