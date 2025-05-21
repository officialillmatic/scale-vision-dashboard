
// CORS headers for use in all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
export function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Create a standard error response
export function createErrorResponse(message: string, status = 400, details?: any) {
  return new Response(
    JSON.stringify({ error: message, details }), 
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// Create a standard success response
export function createSuccessResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data), 
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
