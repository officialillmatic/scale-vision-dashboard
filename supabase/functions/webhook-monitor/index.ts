
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { performDatabaseHealthCheck } from "../_shared/dbHealthCheck.ts";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

const supabaseUrl = env('SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`[WEBHOOK-MONITOR] ${new Date().toISOString()} - Health check request`);

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    if (req.method === 'GET') {
      const healthResult = await performDatabaseHealthCheck(supabaseClient);
      
      console.log(`[WEBHOOK-MONITOR] Health check result:`, JSON.stringify(healthResult, null, 2));
      
      return healthResult;
    }

    return createErrorResponse('Method not allowed', 405);

  } catch (error) {
    console.error('[WEBHOOK-MONITOR] Error:', error);
    return createErrorResponse(`Health check failed: ${error.message}`, 500);
  }
});
