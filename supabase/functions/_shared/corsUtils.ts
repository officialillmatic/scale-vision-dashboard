
// CORS headers for Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Create consistent error responses
export function createErrorResponse(
  message: string, 
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({ 
      error: message 
    }),
    { 
      status, 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    }
  );
}

// Create consistent success responses
export function createSuccessResponse(
  data: any, 
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    }
  );
}
