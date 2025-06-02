
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
    console.log("[DIRECT_SYNC] Raw response type:", typeof data);
    console.log("[DIRECT_SYNC] Raw response keys:", Object.keys(data || {}));
    
    // Debug the calls array specifically
    if (data && data.calls) {
      console.log("[DIRECT_SYNC] Calls array found:", Array.isArray(data.calls));
      console.log("[DIRECT_SYNC] Calls array length:", data.calls.length);
      console.log("[DIRECT_SYNC] First call structure:", data.calls[0] ? JSON.stringify(data.calls[0], null, 2) : "No calls");
    } else {
      console.log("[DIRECT_SYNC] NO CALLS ARRAY FOUND in response");
      console.log("[DIRECT_SYNC] Available properties:", Object.keys(data || {}));
    }
    
    return data;
  };

  const syncCallsDirectly = async (): Promise<DirectSyncResult> => {
    console.log("[DIRECT_SYNC] Starting direct call sync...");
    
    // Step 1: Use EXACT same API call format as Direct API Test
    console.log("[DIRECT_SYNC] Fetching calls from Retell API using EXACT same format as test...");
    
    // This is the EXACT same request body as the working Direct API Test
    const requestBody = { limit: 50 };
    const apiData = await makeRetellAPICall(requestBody);
    
    // ENHANCED PARSING DEBUG
    console.log("[DIRECT_SYNC] === PARSING DEBUG START ===");
    console.log("[DIRECT_SYNC] API Data type:", typeof apiData);
    console.log("[DIRECT_SYNC] API Data:", JSON.stringify(apiData, null, 2));
    
    // Check for calls array in different possible locations
    let calls = [];
    if (apiData && apiData.calls && Array.isArray(apiData.calls)) {
      calls = apiData.calls;
      console.log("[DIRECT_SYNC] Found calls in apiData.calls");
    } else if (apiData && Array.isArray(apiData)) {
      calls = apiData;
      console.log("[DIRECT_SYNC] API data itself is an array");
    } else if (apiData && apiData.data && Array.isArray(apiData.data)) {
      calls = apiData.data;
      console.log("[DIRECT_SYNC] Found calls in apiData.data");
    } else {
      console.log("[DIRECT_SYNC] NO CALLS ARRAY FOUND - checking all properties:");
      if (apiData && typeof apiData === 'object') {
        Object.keys(apiData).forEach(key => {
          console.log(`[DIRECT_SYNC] Property ${key}:`, typeof apiData[key], Array.isArray(apiData[key]) ? `Array length: ${apiData[key].length}` : 'Not an array');
        });
      }
    }
    
    console.log(`[DIRECT_SYNC] EXTRACTED CALLS: ${calls.length} items`);
    console.log("[DIRECT_SYNC] First call extracted:", calls[0] ? JSON.stringify(calls[0], null, 2) : "No calls");
    console.log("[DIRECT_SYNC] === PARSING DEBUG END ===");

    // Step 2: Get user context
    const userId = await getUserId();
    const companyId = await getCompanyId();

    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (!companyId) {
      throw new Error("No company found for user");
    }

    console.log("[DIRECT_SYNC] User context:", { userId, companyId });

    // Step 3: Process and insert calls
    let syncedCalls = 0;
    let processedCalls = 0;
    const errors: string[] = [];

    console.log("[DIRECT_SYNC] === PROCESSING CALLS START ===");
    for (const call of calls) {
      try {
        processedCalls++;
        console.log(`[DIRECT_SYNC] Processing call ${processedCalls}/${calls.length}:`, call.call_id || 'NO_CALL_ID');
        
        // Validate call has required data
        if (!call.call_id) {
          console.log("[DIRECT_SYNC] Skipping call - no call_id:", JSON.stringify(call, null, 2));
          errors.push(`Call ${processedCalls}: Missing call_id`);
          continue;
        }
        
        // Check if call already exists
        console.log(`[DIRECT_SYNC] Checking if call ${call.call_id} already exists...`);
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

        console.log(`[DIRECT_SYNC] Call ${call.call_id} is new, preparing to insert...`);
        
        // Map call data for insertion - ENHANCED MAPPING
        const mappedCall = {
          call_id: call.call_id,
          user_id: userId,
          company_id: companyId,
          agent_id: null, // Will be populated by trigger if agent mapping exists
          retell_agent_id: call.agent_id || call.retell_agent_id || null,
          start_timestamp: call.start_timestamp 
            ? new Date(call.start_timestamp * 1000).toISOString()
            : call.created_at
            ? new Date(call.created_at).toISOString()
            : new Date().toISOString(),
          end_timestamp: call.end_timestamp 
            ? new Date(call.end_timestamp * 1000).toISOString() 
            : null,
          duration_sec: call.duration_sec || call.duration_ms ? Math.floor(call.duration_ms / 1000) : 0,
          duration: call.duration_sec || call.duration_ms ? Math.floor(call.duration_ms / 1000) : 0,
          cost_usd: call.call_cost?.combined_cost || call.cost_usd || 0,
          revenue_amount: 0, // Will be calculated by trigger
          revenue: 0,
          billing_duration_sec: call.duration_sec || call.duration_ms ? Math.floor(call.duration_ms / 1000) : 0,
          rate_per_minute: 0.17,
          call_status: call.call_status || call.status || 'unknown',
          status: call.call_status || call.status || 'unknown',
          from_number: call.from_number || call.from || null,
          to_number: call.to_number || call.to || null,
          disconnection_reason: call.disconnection_reason || null,
          recording_url: call.recording_url || null,
          transcript: call.transcript || null,
          transcript_url: call.transcript_url || null,
          sentiment: call.call_analysis?.user_sentiment || call.sentiment || null,
          sentiment_score: null,
          result_sentiment: call.call_analysis ? JSON.stringify(call.call_analysis) : null,
          disposition: call.disposition || null,
          latency_ms: call.latency?.llm?.p50 || call.latency_ms || null,
          call_summary: call.call_analysis?.call_summary || call.summary || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log(`[DIRECT_SYNC] Mapped call data for ${call.call_id}:`, JSON.stringify(mappedCall, null, 2));

        // Insert the call
        console.log(`[DIRECT_SYNC] Inserting call ${call.call_id} into database...`);
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
        console.error(`[DIRECT_SYNC] Error processing call ${call.call_id || 'unknown'}:`, callError);
        errors.push(`Processing error for ${call.call_id || 'unknown'}: ${callError.message}`);
      }
    }
    console.log("[DIRECT_SYNC] === PROCESSING CALLS END ===");

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
