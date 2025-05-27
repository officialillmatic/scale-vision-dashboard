
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, content-profile, accept, accept-profile, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Max-Age': '86400'
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Handling OPTIONS preflight request');
    console.log('[CORS] Headers being returned:', corsHeaders);
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
  console.log('[CORS] Creating success response with headers:', corsHeaders);
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
