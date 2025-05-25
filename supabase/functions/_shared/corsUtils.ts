
// CORS headers for Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};

// Handle CORS preflight requests
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }
  return null;
}

// Create consistent error responses
export function createErrorResponse(
  message: string, 
  status: number = 400,
  details?: any
): Response {
  const errorBody = {
    error: message,
    status: 'error',
    timestamp: new Date().toISOString()
  };

  if (details) {
    errorBody.details = details;
  }

  return new Response(
    JSON.stringify(errorBody),
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
  const responseBody = {
    ...data,
    status: data.status || 'success',
    timestamp: data.timestamp || new Date().toISOString()
  };

  return new Response(
    JSON.stringify(responseBody),
    { 
      status, 
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      } 
    }
  );
}
