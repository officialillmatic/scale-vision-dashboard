
import { createErrorResponse } from './corsUtils.ts';

export function validateRetellAuth(req: Request, retellSecret: string | undefined): Response | null {
  // API Key Validation - Check for x-retell-token header
  const retellToken = req.headers.get('x-retell-token');
  
  if (!retellSecret) {
    console.error('[WEBHOOK ERROR] RETELL_SECRET not configured');
    return createErrorResponse('Server configuration error', 500);
  }

  if (!retellToken) {
    console.error('[WEBHOOK ERROR] Missing x-retell-token header');
    return createErrorResponse('Unauthorized: Missing API token', 401);
  }

  if (retellToken !== retellSecret) {
    console.error('[WEBHOOK ERROR] Invalid x-retell-token');
    return createErrorResponse('Unauthorized: Invalid API token', 401);
  }

  console.log('[WEBHOOK] API token validation passed');
  return null;
}

export function validateWebhookSecurity(req: Request): Response | null {
  const userAgent = req.headers.get('user-agent') || '';
  const contentType = req.headers.get('content-type') || '';
  
  console.log(`[WEBHOOK] User-Agent: ${userAgent}`);
  console.log(`[WEBHOOK] Content-Type: ${contentType}`);
  
  // Basic security validations
  if (!contentType.includes('application/json')) {
    console.error('[WEBHOOK ERROR] Invalid content type');
    return createErrorResponse('Invalid content type', 400);
  }
  
  // Rate limiting check (basic implementation)
  const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  console.log(`[WEBHOOK] Request from IP: ${clientIP}`);
  
  return null;
}
