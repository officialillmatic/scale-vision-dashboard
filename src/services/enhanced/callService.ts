
import { supabase } from "@/integrations/supabase/client";
import { EnhancedCallData } from "@/lib/types/call-enhanced";

export const fetchEnhancedCalls = async (companyId: string): Promise<EnhancedCallData[]> => {
  console.log("[ENHANCED_CALL_SERVICE] Fetching calls for company:", companyId);
  
  try {
    const { data, error } = await supabase
      .from("calls")
      .select(`
        *,
        call_agent:agents!calls_agent_id_fkey(id, name, rate_per_minute)
      `)
      .eq("company_id", companyId)
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[ENHANCED_CALL_SERVICE] Database error:", error);
      throw error;
    }

    if (!data) {
      console.log("[ENHANCED_CALL_SERVICE] No data returned");
      return [];
    }

    const transformedCalls: EnhancedCallData[] = data.map((call) => ({
      ...call,
      timestamp: new Date(call.timestamp),
      start_time: call.start_time ? new Date(call.start_time) : undefined,
      agent: call.call_agent ? {
        id: call.call_agent.id,
        name: call.call_agent.name,
        rate_per_minute: call.call_agent.rate_per_minute
      } : undefined
    }));

    console.log("[ENHANCED_CALL_SERVICE] Successfully fetched and transformed", transformedCalls.length, "calls");
    return transformedCalls;
    
  } catch (error: any) {
    console.error("[ENHANCED_CALL_SERVICE] Error in fetchEnhancedCalls:", error);
    
    if (error.code === "PGRST301") {
      console.log("[ENHANCED_CALL_SERVICE] No calls found - returning empty array");
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

export const createEnhancedCall = async (callData: Partial<EnhancedCallData>): Promise<EnhancedCallData | null> => {
  try {
    const { data, error } = await supabase
      .from("calls")
      .insert([callData])
      .select()
      .single();

    if (error) {
      console.error("[ENHANCED_CALL_SERVICE] Error creating call:", error);
      throw error;
    }

    return {
      ...data,
      timestamp: new Date(data.timestamp),
      start_time: data.start_time ? new Date(data.start_time) : undefined,
    };
  } catch (error: any) {
    console.error("[ENHANCED_CALL_SERVICE] Error in createEnhancedCall:", error);
    throw new Error(`Failed to create call: ${error.message}`);
  }
};

export const updateEnhancedCall = async (callId: string, updates: Partial<EnhancedCallData>): Promise<EnhancedCallData | null> => {
  try {
    const { data, error } = await supabase
      .from("calls")
      .update(updates)
      .eq("id", callId)
      .select()
      .single();

    if (error) {
      console.error("[ENHANCED_CALL_SERVICE] Error updating call:", error);
      throw error;
    }

    return {
      ...data,
      timestamp: new Date(data.timestamp),
      start_time: data.start_time ? new Date(data.start_time) : undefined,
    };
  } catch (error: any) {
    console.error("[ENHANCED_CALL_SERVICE] Error in updateEnhancedCall:", error);
    throw new Error(`Failed to update call: ${error.message}`);
  }
};
