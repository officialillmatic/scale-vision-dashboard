
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";

export interface Call {
  id: string;
  company_id: string;
  from: string;
  to: string;
  timestamp: string;
  duration: number;
  call_status: 'ringing' | 'in-progress' | 'completed' | 'failed';
  recording_url: string | null;
  transcription: string | null;
  created_at: string;
}

export interface CallData {
  id: string;
  call_id: string;
  timestamp: Date;
  duration_sec: number;
  cost_usd: number;
  sentiment: string;
  disconnection_reason: string | null;
  call_status: string;
  from: string;
  to: string;
  from_number: string;
  to_number: string;
  audio_url: string | null;
  recording_url: string | null;
  transcript: string | null;
  transcript_url: string | null;
  user_id: string | null;
  result_sentiment: string | null;
  company_id: string;
  call_type: string; 
  latency_ms: number | null;
  call_summary: string | null;
  start_time: Date;
  sentiment_score: number | null;
  disposition: string | null;
  agent: {
    id: string;
    name: string;
    rate_per_minute?: number;
    retell_agent_id?: string;
  } | null;
}

export interface CallFilters {
  status?: Call['call_status'];
  from?: string;
  to?: string;
}

// Transform call data to ensure proper type conversion
function transformCallData(call: any): CallData {
  return {
    id: call.id,
    call_id: call.call_id,
    timestamp: new Date(call.timestamp || call.start_time),
    start_time: new Date(call.start_time || call.timestamp),
    duration_sec: call.duration_sec || 0,
    cost_usd: call.cost_usd || 0,
    sentiment: call.sentiment || "neutral",
    sentiment_score: call.sentiment_score,
    disconnection_reason: call.disconnection_reason,
    call_status: call.call_status || "unknown",
    from: call.from || call.from_number || "unknown",
    to: call.to || call.to_number || "unknown",
    from_number: call.from_number || call.from || "unknown",
    to_number: call.to_number || call.to || "unknown",
    audio_url: call.audio_url || call.recording_url,
    recording_url: call.recording_url || call.audio_url,
    transcript: call.transcript,
    transcript_url: call.transcript_url,
    user_id: call.user_id,
    result_sentiment: call.result_sentiment,
    company_id: call.company_id,
    call_type: call.call_type || "phone_call",
    latency_ms: call.latency_ms || 0,
    call_summary: call.call_summary,
    disposition: call.disposition,
    agent: call.agent
  };
}

// Main function to get calls with proper company filtering
export const getCalls = async (
  companyId: string,
  filters: CallFilters = {}
): Promise<Call[]> => {
  try {
    console.log("[CALL_SERVICE] Fetching calls for company:", companyId);
    
    let query = supabase
      .from("calls")
      .select("*")
      .eq("company_id", companyId);

    // Apply filters
    if (filters.status) {
      query = query.eq("call_status", filters.status);
    }
    
    if (filters.from) {
      query = query.ilike("from", `%${filters.from}%`);
    }
    
    if (filters.to) {
      query = query.ilike("to", `%${filters.to}%`);
    }

    // Add sorting
    query = query.order("timestamp", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[CALL_SERVICE] Error fetching calls:", error);
      handleError(error, {
        fallbackMessage: "Failed to fetch calls",
        logToConsole: true
      });
      return [];
    }

    console.log(`[CALL_SERVICE] Successfully fetched ${data?.length || 0} calls`);
    return data as Call[];
  } catch (error) {
    console.error("[CALL_SERVICE] Unexpected error:", error);
    handleError(error, {
      fallbackMessage: "Error fetching calls",
      logToConsole: true
    });
    return [];
  }
};

// Enhanced fetchCalls function with better error handling and filtering
export const fetchCalls = async (companyId: string): Promise<CallData[]> => {
  try {
    console.log("[CALL_SERVICE] Fetching enhanced call data for company:", companyId);
    
    const { data, error } = await supabase
      .from("calls")
      .select(`
        *,
        agent:agent_id (
          id,
          name,
          rate_per_minute,
          retell_agent_id
        )
      `)
      .eq("company_id", companyId)
      .order("start_time", { ascending: false });
      
    if (error) {
      console.error("[CALL_SERVICE] Error fetching enhanced calls:", error);
      handleError(error, {
        fallbackMessage: "Failed to fetch calls",
        logToConsole: true
      });
      return [];
    }

    if (!data) {
      console.log("[CALL_SERVICE] No call data returned");
      return [];
    }

    // Transform the database rows to CallData format
    const transformedData = data.map(transformCallData);
    console.log(`[CALL_SERVICE] Successfully transformed ${transformedData.length} calls`);
    
    return transformedData;
  } catch (error) {
    console.error("[CALL_SERVICE] Unexpected error in fetchCalls:", error);
    handleError(error, {
      fallbackMessage: "Error fetching calls",
      logToConsole: true
    });
    return [];
  }
};
