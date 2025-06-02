
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, createErrorResponse } from "../_shared/corsUtils.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[RETELL-SYNC-${requestId}] ${new Date().toISOString()} - DEPRECATED ENDPOINT ACCESSED`);

  // This endpoint is now deprecated - sync is handled directly in the frontend
  return createErrorResponse(
    'This endpoint is deprecated. Agent synchronization is now handled directly in the frontend using the Supabase client.',
    410 // Gone
  );
});
