
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CallData {
  id: string;
  call_id: string;
  timestamp: Date;
  duration_sec: number;
  cost_usd: number;
  sentiment: string | null;
  disconnection_reason: string | null;
  call_status: string;
  from: string;
  to: string;
  audio_url: string | null;
}

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

    // Convert timestamp strings to Date objects
    return data.map(call => ({
      ...call,
      timestamp: new Date(call.timestamp)
    }));
  } catch (error) {
    console.error("Error in fetchCalls:", error);
    toast.error("Failed to load calls");
    return [];
  }
};

export const syncRetellCalls = async (): Promise<boolean> => {
  try {
    // Get the user's session for authentication
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error("You must be logged in to sync calls");
      return false;
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke("fetch-retell-calls", {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      }
    });

    if (error) {
      console.error("Error syncing calls:", error);
      toast.error("Failed to sync calls from Retell");
      return false;
    }

    toast.success(`Successfully synced ${data.processed} calls`);
    return true;
  } catch (error) {
    console.error("Error in syncRetellCalls:", error);
    toast.error("Failed to sync calls from Retell");
    return false;
  }
};
