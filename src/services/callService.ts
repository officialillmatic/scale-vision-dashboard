import { supabase } from "@/integrations/supabase/client";
import { CallsTable } from "@/types/supabase";

export type CallData = Omit<CallsTable, 'timestamp' | 'start_time'> & {
  timestamp: Date;
  start_time?: Date;
  agent?: {
    id: string;
    name: string;
    agent_id?: string;
    rate_per_minute?: number;
  };
  from_number?: string;
  to_number?: string;
  recording_url?: string;
  transcript_url?: string;
  sentiment_score?: number;
  disposition?: string;
  latency_ms?: number;
  call_type?: string;
  call_summary?: string;
};

export const fetchCalls = async (companyId: string): Promise<CallData[]> => {
  console.log("[CALL_SERVICE] Fetching calls for company:", companyId);
  
  try {
    const { data, error } = await supabase
      .from("calls")
      .select(`
        *,
        agent:agents(id, name, agent_id)
      `)
      .eq("company_id", companyId)
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[CALL_SERVICE] Database error:", error);
      throw error;
    }

    if (!data) {
      console.log("[CALL_SERVICE] No data returned");
      return [];
    }

    // Transform the data to ensure proper date objects
    const transformedCalls: CallData[] = data.map((call) => ({
      ...call,
      timestamp: new Date(call.timestamp),
      start_time: call.start_time ? new Date(call.start_time) : undefined,
    }));

    console.log("[CALL_SERVICE] Successfully fetched and transformed", transformedCalls.length, "calls");
    return transformedCalls;
    
  } catch (error: any) {
    console.error("[CALL_SERVICE] Error in fetchCalls:", error);
    
    // Provide more specific error information
    if (error.code === "PGRST301") {
      console.log("[CALL_SERVICE] No calls found - returning empty array");
      return [];
    }
    
    if (error.message?.includes("permission denied")) {
      throw new Error("Permission denied: You don't have access to view calls for this company");
    }
    
    if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
      throw new Error("Database configuration error: Please contact support");
    }
    
    throw new Error(`Failed to fetch calls: ${error.message}`);
  }
};

export const createCall = async (callData: Partial<CallData>): Promise<CallData | null> => {
  try {
    const { data, error } = await supabase
      .from("calls")
      .insert([callData])
      .select()
      .single();

    if (error) {
      console.error("[CALL_SERVICE] Error creating call:", error);
      throw error;
    }

    return {
      ...data,
      timestamp: new Date(data.timestamp),
      start_time: data.start_time ? new Date(data.start_time) : undefined,
    };
  } catch (error: any) {
    console.error("[CALL_SERVICE] Error in createCall:", error);
    throw new Error(`Failed to create call: ${error.message}`);
  }
};

export const updateCall = async (callId: string, updates: Partial<CallData>): Promise<CallData | null> => {
  try {
    const { data, error } = await supabase
      .from("calls")
      .update(updates)
      .eq("id", callId)
      .select()
      .single();

    if (error) {
      console.error("[CALL_SERVICE] Error updating call:", error);
      throw error;
    }

    return {
      ...data,
      timestamp: new Date(data.timestamp),
      start_time: data.start_time ? new Date(data.start_time) : undefined,
    };
  } catch (error: any) {
    console.error("[CALL_SERVICE] Error in updateCall:", error);
    throw new Error(`Failed to update call: ${error.message}`);
  }
};
