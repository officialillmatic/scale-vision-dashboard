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

export interface CallFilters {
  status?: Call['call_status'];
  from?: string;
  to?: string;
}

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
