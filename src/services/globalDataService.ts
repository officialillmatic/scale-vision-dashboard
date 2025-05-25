
import { supabase } from "@/integrations/supabase/client";
import { Agent } from "@/services/agentService";
import { CallData } from "@/services/callService";

export const fetchGlobalAgents = async (): Promise<Agent[]> => {
  console.log("[GLOBAL_DATA_SERVICE] Fetching global agents");
  
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("name");

    if (error) {
      console.error("[GLOBAL_DATA_SERVICE] Error fetching global agents:", error);
      throw error;
    }

    console.log("[GLOBAL_DATA_SERVICE] Successfully fetched", data?.length || 0, "global agents");
    return data || [];
  } catch (error: any) {
    console.error("[GLOBAL_DATA_SERVICE] Error in fetchGlobalAgents:", error);
    throw new Error(`Failed to fetch global agents: ${error.message}`);
  }
};

export const fetchGlobalCalls = async (): Promise<CallData[]> => {
  console.log("[GLOBAL_DATA_SERVICE] Fetching global calls");
  
  try {
    const { data, error } = await supabase
      .from("calls")
      .select(`
        *,
        agent:agents(id, name, agent_id, rate_per_minute)
      `)
      .order("timestamp", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("[GLOBAL_DATA_SERVICE] Error fetching global calls:", error);
      throw error;
    }

    // Transform the data to ensure proper date objects
    const transformedCalls: CallData[] = (data || []).map((call) => ({
      ...call,
      timestamp: new Date(call.timestamp),
      start_time: call.start_time ? new Date(call.start_time) : undefined,
    }));

    console.log("[GLOBAL_DATA_SERVICE] Successfully fetched and transformed", transformedCalls.length, "global calls");
    return transformedCalls;
  } catch (error: any) {
    console.error("[GLOBAL_DATA_SERVICE] Error in fetchGlobalCalls:", error);
    throw new Error(`Failed to fetch global calls: ${error.message}`);
  }
};
