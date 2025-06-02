
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { loadSyncConfig } from "./config.ts";
import { RetellApiClient } from "./retellApiClient.ts";
import { SyncOrchestrator } from "./syncOrchestrator.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[SYNC-CALLS-${requestId}] ${new Date().toISOString()} - ${req.method} request received`);

  try {
    // Load configuration with better error messages
    let config;
    try {
      config = loadSyncConfig();
      console.log(`[SYNC-CALLS-${requestId}] Configuration loaded successfully`);
      console.log(`[SYNC-CALLS-${requestId}] API Key present: ${config.retellApiKey ? 'YES' : 'NO'}`);
      console.log(`[SYNC-CALLS-${requestId}] API Base URL: ${config.retellApiBaseUrl}`);
    } catch (configError) {
      console.error(`[SYNC-CALLS-${requestId}] Configuration error:`, configError);
      
      if (configError.message.includes('RETELL_API_KEY')) {
        return createErrorResponse('Retell API key not configured. Please set RETELL_API_KEY in your edge function secrets.', 500);
      }
      
      return createErrorResponse(`Configuration error: ${configError.message}`, 500);
    }

    const supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey);
    const retellClient = new RetellApiClient(config.retellApiKey, config.retellApiBaseUrl);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      console.log(`[SYNC-CALLS-${requestId}] Request body:`, JSON.stringify(requestBody));

      const orchestrator = new SyncOrchestrator(supabaseClient, retellClient, requestId);

      // Handle test mode
      if (requestBody.test) {
        try {
          console.log(`[SYNC-CALLS-${requestId}] Running connectivity test...`);
          const testResult = await orchestrator.performTest();
          console.log(`[SYNC-CALLS-${requestId}] Test result:`, testResult);
          return createSuccessResponse(testResult);
        } catch (error) {
          console.error(`[SYNC-CALLS-${requestId}] Test failed:`, error);
          console.error(`[SYNC-CALLS-${requestId}] Test error stack:`, error.stack);
          
          if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
            return createErrorResponse('Retell API authentication failed. Please check your API key.', 401);
          }
          
          return createErrorResponse(`Test failed: ${error.message}`, 500);
        }
      }

      // Perform full sync
      try {
        console.log(`[SYNC-CALLS-${requestId}] Starting full sync...`);
        const summary = await orchestrator.performSync();
        console.log(`[SYNC-CALLS-${requestId}] Final summary:`, summary);
        return createSuccessResponse(summary);
      } catch (error) {
        console.error(`[SYNC-CALLS-${requestId}] Sync failed:`, error);
        console.error(`[SYNC-CALLS-${requestId}] Sync error stack:`, error.stack);
        
        if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
          return createErrorResponse('Retell API authentication failed. Please check your API key.', 401);
        }
        
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          return createErrorResponse('Network error connecting to Retell API. Please try again.', 503);
        }
        
        return createErrorResponse(`Sync failed: ${error.message}`, 500);
      }
    }

    return createErrorResponse('Method not allowed - only POST requests supported', 405);

  } catch (error) {
    console.error(`[SYNC-CALLS-${requestId}] Fatal error:`, error);
    console.error(`[SYNC-CALLS-${requestId}] Fatal error stack:`, error.stack);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
