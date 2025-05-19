
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
  audio_url: string | null;
  transcript: string | null;
  user_id: string | null;
  result_sentiment: string | null;
  company_id: string;
  call_type: string; // Added field
  latency_ms: number | null; // Added field
  call_summary: string | null; // Added field
}

export interface CallFilters {
  status?: Call['call_status'];
  from?: string;
  to?: string;
}

// Main function to get calls
export const getCalls = async (
  companyId: string,
  filters: CallFilters = {}
): Promise<Call[]> => {
  try {
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
      handleError(error, {
        fallbackMessage: "Failed to fetch calls",
        logToConsole: true
      });
      return [];
    }

    return data as Call[];
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Error fetching calls",
      logToConsole: true
    });
    return [];
  }
};

// Add an alias function for fetchCalls that calls getCalls
export const fetchCalls = async (companyId: string): Promise<CallData[]> => {
  try {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .eq("company_id", companyId)
      .order("timestamp", { ascending: false });
      
    if (error) {
      handleError(error, {
        fallbackMessage: "Failed to fetch calls",
        logToConsole: true
      });
      return [];
    }

    // Convert the database rows to CallData format
    return data.map(call => ({
      id: call.id,
      call_id: call.call_id,
      timestamp: new Date(call.timestamp),
      duration_sec: call.duration_sec,
      cost_usd: call.cost_usd,
      sentiment: call.sentiment || "neutral",
      disconnection_reason: call.disconnection_reason,
      call_status: call.call_status,
      from: call.from,
      to: call.to,
      audio_url: call.audio_url,
      transcript: call.transcript,
      user_id: call.user_id,
      result_sentiment: call.result_sentiment,
      company_id: call.company_id,
      call_type: call.call_type || "phone_call",
      latency_ms: call.latency_ms || 0,
      call_summary: call.call_summary
    }));
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Error fetching calls",
      logToConsole: true
    });
    return [];
  }
};
