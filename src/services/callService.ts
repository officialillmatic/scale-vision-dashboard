import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CallsTable } from "@/types/supabase";

export type CallData = Omit<CallsTable, 'timestamp'> & {
  timestamp: Date; // Override timestamp to be a Date object
};

export const fetchCalls = async (): Promise<CallData[]> => {
  try {
    const { data, error } = await supabase
      .from("calls") 
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching calls:", error);
      toast.error("Failed to load calls");
      return [];
    }

    // Convert timestamp strings to Date objects with proper type assertions
    return (data || []).map((call): CallData => ({
      id: call.id,
      call_id: call.call_id,
      timestamp: new Date(call.timestamp),
      duration_sec: call.duration_sec,
      cost_usd: call.cost_usd,
      sentiment: call.sentiment,
      disconnection_reason: call.disconnection_reason,
      call_status: call.call_status,
      from: call.from,
      to: call.to,
      audio_url: call.audio_url,
      transcript: call.transcript,
      user_id: call.user_id,
      result_sentiment: call.result_sentiment,
      company_id: call.company_id
    }));
  } catch (error) {
    console.error("Error in fetchCalls:", error);
    toast.error("Failed to load calls");
    return [];
  }
};

export const syncCalls = async (): Promise<boolean> => {
  try {
    // Show loading toast
    const loadingToast = toast.loading("Syncing calls...");
    
    // Get the user's session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.dismiss(loadingToast);
      toast.error("You must be logged in to sync calls");
      return false;
    }

    // Call the edge function with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(
        "https://jqkkhwoybcenxqpvodev.supabase.co/functions/v1/sync-calls", 
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response from sync-calls API:", response.status, errorData);
        toast.dismiss(loadingToast);
        toast.error(`Failed to sync calls: ${errorData.error || response.statusText}`);
        return false;
      }
      
      const data = await response.json();
      toast.dismiss(loadingToast);
      
      if (data.new_calls > 0) {
        toast.success(`Successfully synced ${data.new_calls} new calls`);
      } else {
        toast.success("Synced successfully. No new calls found.");
      }
      
      return true;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Fetch error in sync operation:", fetchError);
      toast.dismiss(loadingToast);
      
      if (fetchError.name === "AbortError") {
        toast.error("Sync operation timed out. Please try again later.");
      } else {
        toast.error("Failed to sync calls");
      }
      
      return false;
    }
  } catch (error) {
    console.error("Error in syncCalls:", error);
    toast.error("Failed to sync calls");
    return false;
  }
};

// For backward compatibility
export const syncRetellCalls = syncCalls;
