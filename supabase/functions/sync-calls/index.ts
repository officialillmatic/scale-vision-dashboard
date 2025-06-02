
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
    // Load configuration
    const config = loadSyncConfig();
    const supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey);
    const retellClient = new RetellApiClient(config.retellApiKey, config.retellApiBaseUrl);
    
    console.log(`[SYNC-CALLS-${requestId}] Configuration loaded successfully`);
    
    if (req.method === 'POST') {
      const requestBody = await req.json().catch(() => ({}));
      console.log(`[SYNC-CALLS-${requestId}] Request body:`, JSON.stringify(requestBody));

      const orchestrator = new SyncOrchestrator(supabaseClient, retellClient, requestId);

      // Handle test mode
      if (requestBody.test) {
        try {
          console.log(`[SYNC-CALLS-${requestId}] Running connectivity test...`);
          const testResult = await orchestrator.performTest();
          return createSuccessResponse(testResult);
        } catch (error) {
          console.error(`[SYNC-CALLS-${requestId}] Test failed:`, error);
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
        return createErrorResponse(`Sync failed: ${error.message}`, 500);
      }
    }

    return createErrorResponse('Method not allowed - only POST requests supported', 405);

  } catch (error) {
    console.error(`[SYNC-CALLS-${requestId}] Fatal error:`, error);
    return createErrorResponse(`Sync failed: ${error.message}`, 500);
  }
});
