
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DirectSyncResult {
  success: boolean;
  synced_calls: number;
  processed_calls: number;
  total_calls_from_api: number;
  errors?: string[];
  timestamp: string;
}

export const useDirectCallSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<DirectSyncResult | null>(null);

  const getCompanyId = async () => {
    const { data } = await supabase.rpc('get_user_company_id_simple');
    return data;
  };

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const makeRetellAPICall = async (requestBody: any) => {
    const retellApiKey = import.meta.env.VITE_RETELL_API_KEY;
    if (!retellApiKey) {
      throw new Error("RETELL_API_KEY not found in environment variables");
    }

    const apiUrl = 'https://api.retellai.com/v2/list-calls';
    
    console.log("[DIRECT_SYNC] === EXACT API CALL DEBUG ===");
    console.log("[DIRECT_SYNC] API URL:", apiUrl);
    console.log("[DIRECT_SYNC] Request method: POST");
    console.log("[DIRECT_SYNC] Authorization header:", `Bearer ${retellApiKey.substring(0, 15)}...`);
    console.log("[DIRECT_SYNC] Content-Type: application/json");
    console.log("[DIRECT_SYNC] Request body:", JSON.stringify(requestBody, null, 2));
    console.log("[DIRECT_SYNC] === END API CALL DEBUG ===");

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log("[DIRECT_SYNC] Response status:", response.status);
    console.log("[DIRECT_SYNC] Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[DIRECT_SYNC] API Error Response:", errorText);
      throw new Error(`Retell API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("[DIRECT_SYNC] Raw API Response:", JSON.stringify(data, null, 2));
    console.log("[DIRECT_SYNC] Calls found:", data.calls?.length || 0);
    
    return data;
  };

  const syncCallsDirectly = async (): Promise<DirectSyncResult> => {
    console.log("[DIRECT_SYNC] Starting direct call sync...");
    
    // Step 1: Use EXACT same API call format as Direct API Test
    console.log("[DIRECT_SYNC] Fetching calls from Retell API using EXACT same format as test...");
    
    // This is the EXACT same request body as the working Direct API Test
    const requestBody = { limit: 50 };
    const apiData = await makeRetellAPICall(requestBody);
    
    const calls = apiData.calls || [];
    console.log(`[DIRECT_SYNC] Fetched ${calls.length} calls from Retell API (same as test format)`);

    // Step 2: Get user context
    const userId = await getUserId();
    const companyId = await getCompanyId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (!companyId) {
      throw new Error("No company found for user");
    }

    // Step 3: Process and insert calls
    let syncedCalls = 0;
    let processedCalls = 0;
    const errors: string[] = [];

    for (const call of calls) {
      try {
        processedCalls++;
        
        // Check if call already exists
        const { data: existingCall, error: checkError } = await supabase
          .from('retell_calls')
          .select('id')
          .eq('call_id', call.call_id)
          .maybeSingle();

        if (checkError) {
          console.error(`[DIRECT_SYNC] Error checking existing call ${call.call_id}:`, checkError);
          errors.push(`Check error for ${call.call_id}: ${checkError.message}`);
          continue;
        }

        if (existingCall) {
          console.log(`[DIRECT_SYNC] Call ${call.call_id} already exists, skipping`);
          continue;
        }

        // Map call data for insertion
        const mappedCall = {
          call_id: call.call_id,
          user_id: userId,
          company_id: companyId,
          agent_id: null, // Will be populated by trigger if agent mapping exists
          retell_agent_id: call.agent_id || null,
          start_timestamp: call.start_timestamp 
            ? new Date(call.start_timestamp * 1000).toISOString()
            : new Date().toISOString(),
          end_timestamp: call.end_timestamp 
            ? new Date(call.end_timestamp * 1000).toISOString() 
            : null,
          duration_sec: call.duration_sec || 0,
          duration: call.duration_sec || 0,
          cost_usd: call.call_cost?.combined_cost || 0,
          revenue_amount: 0, // Will be calculated by trigger
          revenue: 0,
          billing_duration_sec: call.duration_sec || 0,
          rate_per_minute: 0.17,
          call_status: call.call_status || 'unknown',
          status: call.call_status || 'unknown',
          from_number: call.from_number || null,
          to_number: call.to_number || null,
          disconnection_reason: call.disconnection_reason || null,
          recording_url: call.recording_url || null,
          transcript: call.transcript || null,
          transcript_url: call.transcript_url || null,
          sentiment: call.call_analysis?.user_sentiment || null,
          sentiment_score: null,
          result_sentiment: call.call_analysis ? JSON.stringify(call.call_analysis) : null,
          disposition: call.disposition || null,
          latency_ms: call.latency?.llm?.p50 || null,
          call_summary: call.call_analysis?.call_summary || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log(`[DIRECT_SYNC] Inserting call ${call.call_id}`);

        // Insert the call
        const { error: insertError } = await supabase
          .from('retell_calls')
          .insert(mappedCall);

        if (insertError) {
          console.error(`[DIRECT_SYNC] Insert error for ${call.call_id}:`, insertError);
          errors.push(`Insert error for ${call.call_id}: ${insertError.message}`);
          continue;
        }

        console.log(`[DIRECT_SYNC] Successfully synced call ${call.call_id}`);
        syncedCalls++;

      } catch (callError: any) {
        console.error(`[DIRECT_SYNC] Error processing call ${call.call_id}:`, callError);
        errors.push(`Processing error for ${call.call_id}: ${callError.message}`);
      }
    }

    const result: DirectSyncResult = {
      success: true,
      synced_calls: syncedCalls,
      processed_calls: processedCalls,
      total_calls_from_api: calls.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      timestamp: new Date().toISOString()
    };

    console.log("[DIRECT_SYNC] Sync completed:", result);
    return result;
  };

  const handleDirectSync = async () => {
    if (isSyncing) {
      toast.warning("Sync already in progress");
      return;
    }

    setIsSyncing(true);
    
    try {
      const result = await syncCallsDirectly();
      setLastSyncResult(result);
      
      if (result.synced_calls > 0) {
        toast.success(`Successfully synced ${result.synced_calls} new calls!`);
      } else if (result.processed_calls > 0) {
        toast.info(`Sync completed - ${result.processed_calls} calls checked, all up to date`);
      } else {
        toast.info("No calls found to sync");
      }

    } catch (error: any) {
      console.error("[DIRECT_SYNC] Sync failed:", error);
      const failedResult: DirectSyncResult = {
        success: false,
        synced_calls: 0,
        processed_calls: 0,
        total_calls_from_api: 0,
        errors: [error.message],
        timestamp: new Date().toISOString()
      };
      setLastSyncResult(failedResult);
      
      if (error.message?.includes('RETELL_API_KEY')) {
        toast.error('Retell API key not configured. Please check your environment settings.');
      } else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        toast.error('Authentication failed. Please check your Retell API credentials.');
      } else {
        toast.error(`Sync failed: ${error.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    lastSyncResult,
    handleDirectSync,
    syncCallsDirectly
  };
};
