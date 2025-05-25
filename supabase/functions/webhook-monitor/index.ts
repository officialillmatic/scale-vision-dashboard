
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { corsHeaders, handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get recent webhook activity by checking call insertions
    const { data: recentCalls, error: callsError } = await supabaseClient
      .from('calls')
      .select('call_id, timestamp, call_status, event_type:call_type')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (callsError) {
      console.error('Error fetching recent calls:', callsError);
      return createErrorResponse('Failed to fetch webhook activity', 500);
    }

    // Get webhook health metrics
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const { data: recentWebhooks, error: webhookError } = await supabaseClient
      .from('calls')
      .select('call_id')
      .gte('timestamp', oneHourAgo.toISOString());

    if (webhookError) {
      console.error('Error fetching webhook metrics:', webhookError);
      return createErrorResponse('Failed to fetch webhook metrics', 500);
    }

    const webhookHealth = {
      last_hour_count: recentWebhooks?.length || 0,
      status: (recentWebhooks?.length || 0) > 0 ? 'active' : 'inactive',
      last_activity: recentCalls?.[0]?.timestamp || null
    };

    return createSuccessResponse({
      webhook_health: webhookHealth,
      recent_activity: recentCalls || [],
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Monitor error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
