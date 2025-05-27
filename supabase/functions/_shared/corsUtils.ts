
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-profile, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }
  return null;
}

export function createErrorResponse(message: string, status: number = 400): Response {
  console.error(`[ERROR] ${status}: ${message}`);
  return new Response(
    JSON.stringify({ 
      error: message, 
      timestamp: new Date().toISOString(),
      status 
    }),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({ 
      ...data, 
      timestamp: new Date().toISOString(),
      status: 'success'
    }),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}
