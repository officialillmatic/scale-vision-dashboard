
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }
  return null;
}

export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      success: false,
      timestamp: new Date().toISOString()
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

export function createSuccessResponse(data: any): Response {
  return new Response(
    JSON.stringify({ 
      ...data, 
      success: true,
      timestamp: new Date().toISOString()
    }), 
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}
