import { debugLog } from "@/lib/debug";

import { supabase } from "@/lib/supabase";
import { EnhancedCallData } from "@/lib/types/call-enhanced";

export async function fetchEnhancedCalls(companyId?: string | null): Promise<EnhancedCallData[]> {
  debugLog("[CALL_SERVICE] Fetching enhanced calls with companyId:", companyId);
  
  try {
    let query = supabase
      .from('retell_calls')
      .select(`
        *,
        agent:agents(
          id,
          name,
          rate_per_minute
        )
      `)
      .order('start_timestamp', { ascending: false });

    // If companyId is provided, filter by it. Otherwise, fetch all calls.
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[CALL_SERVICE] Error fetching calls:", error);
      throw error;
    }

    if (!data) {
      debugLog("[CALL_SERVICE] No data returned from query");
      return [];
    }

    debugLog(`[CALL_SERVICE] Successfully fetched ${data.length} calls`);

    // Transform the data to match EnhancedCallData interface
    const enhancedCalls: EnhancedCallData[] = data.map((call) => ({
      id: call.id,
      call_id: call.call_id,
      user_id: call.user_id || '',
      company_id: call.company_id || '',
      agent_id: call.agent_id,
      timestamp: new Date(call.start_timestamp),
      start_time: call.start_timestamp ? new Date(call.start_timestamp) : undefined,
      duration_sec: call.duration_sec || 0,
      cost_usd: call.cost_usd || 0,
      sentiment: call.sentiment,
      sentiment_score: call.sentiment_score,
      disconnection_reason: call.disconnection_reason,
      call_status: call.call_status || 'unknown',
      from: call.from_number || 'Unknown',
      to: call.to_number || 'Unknown',
      from_number: call.from_number,
      to_number: call.to_number,
      audio_url: call.recording_url,
      recording_url: call.recording_url,
      transcript: call.transcript,
      transcript_url: call.transcript_url,
      call_type: 'phone_call',
      call_summary: call.call_summary,
      disposition: call.disposition,
      latency_ms: call.latency_ms,
      result_sentiment: call.result_sentiment,
      agent: call.agent ? {
        id: call.agent.id,
        name: call.agent.name,
        rate_per_minute: call.agent.rate_per_minute
      } : undefined
    }));

    return enhancedCalls;
  } catch (error) {
    console.error("[CALL_SERVICE] Exception while fetching calls:", error);
    throw error;
  }
}
