
import { handleCors, createSuccessResponse, createErrorResponse } from '../_shared/corsUtils.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('[CHECK-EMAIL-CONFIG] Checking email configuration');
    
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const configured = !!resendApiKey && resendApiKey.trim() !== '';
    
    console.log('[CHECK-EMAIL-CONFIG] RESEND_API_KEY configured:', configured);
    
    return createSuccessResponse({
      configured,
      service: 'resend'
    });
  } catch (error) {
    console.error('[CHECK-EMAIL-CONFIG] Error:', error);
    return createErrorResponse('Failed to check email configuration', 500);
  }
});
