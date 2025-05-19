
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
  const calls = await getCalls(companyId);
  
  // Convert the regular Call objects to CallData format
  return calls.map(call => ({
    id: call.id,
    call_id: call.id.substring(0, 8),
    timestamp: new Date(call.timestamp),
    duration_sec: call.duration,
    cost_usd: 0.05, // Default cost if not available
    sentiment: "neutral", // Default sentiment if not available
    disconnection_reason: null,
    call_status: call.call_status,
    from: call.from,
    to: call.to,
    audio_url: call.recording_url,
    transcript: call.transcription,
    user_id: null,
    result_sentiment: null,
    company_id: call.company_id
  }));
};
