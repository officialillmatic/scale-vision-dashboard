
import { createErrorResponse } from './corsUtils.ts';

export function validateRetellAuth(req: Request, retellSecret: string | undefined): Response | null {
  console.log('[RETELL-AUTH] Starting authentication validation');
  
  // Check if RETELL_SECRET is configured
  if (!retellSecret) {
    console.error('[RETELL-AUTH] RETELL_SECRET not configured in environment');
    return createErrorResponse('Server configuration error: RETELL_SECRET missing', 500);
  }

  // Get the authentication token from headers
  // Retell sends the token in x-retell-token header
  const retellToken = req.headers.get('x-retell-token');
  const authHeader = req.headers.get('authorization');
  
  console.log('[RETELL-AUTH] Headers check:');
  console.log(`- x-retell-token present: ${!!retellToken}`);
  console.log(`- authorization present: ${!!authHeader}`);
  console.log(`- x-retell-token value: ${retellToken ? '[REDACTED]' : 'null'}`);
  
  // Primary validation: x-retell-token header
  if (!retellToken) {
    console.error('[RETELL-AUTH] Missing x-retell-token header');
    return createErrorResponse('Unauthorized: Missing x-retell-token header', 401);
  }

  // Validate the token matches our secret
  if (retellToken !== retellSecret) {
    console.error('[RETELL-AUTH] Invalid x-retell-token - token mismatch');
    console.log(`[RETELL-AUTH] Expected length: ${retellSecret.length}, Received length: ${retellToken.length}`);
    return createErrorResponse('Unauthorized: Invalid x-retell-token', 401);
  }

  console.log('[RETELL-AUTH] ✅ Authentication successful');
  return null;
}

export function validateWebhookSecurity(req: Request): Response | null {
  console.log('[RETELL-SECURITY] Starting security validation');
  
  const userAgent = req.headers.get('user-agent') || '';
  const contentType = req.headers.get('content-type') || '';
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  
  console.log(`[RETELL-SECURITY] Request details:`);
  console.log(`- User-Agent: ${userAgent}`);
  console.log(`- Content-Type: ${contentType}`);
  console.log(`- Origin: ${origin}`);
  console.log(`- Referer: ${referer}`);
  
  // Validate Content-Type
  if (!contentType.includes('application/json')) {
    console.error('[RETELL-SECURITY] Invalid content type - expected application/json');
    return createErrorResponse('Invalid content type - expected application/json', 400);
  }
  
  // Log client information for monitoring
  const clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   req.headers.get('cf-connecting-ip') || 
                   'unknown';
  
  console.log(`[RETELL-SECURITY] Request from IP: ${clientIP}`);
  
  // Additional security checks for Retell webhooks
  // Retell typically sends webhooks with specific patterns
  if (userAgent && !userAgent.toLowerCase().includes('retell') && 
      !userAgent.toLowerCase().includes('webhook') && 
      !userAgent.toLowerCase().includes('http')) {
    console.warn(`[RETELL-SECURITY] Unusual User-Agent for webhook: ${userAgent}`);
  }
  
  console.log('[RETELL-SECURITY] ✅ Security validation passed');
  return null;
}

// Helper function to log authentication attempts for debugging
export function logAuthAttempt(req: Request, success: boolean, reason?: string): void {
  const timestamp = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  console.log(`[RETELL-AUTH-LOG] ${timestamp} - IP: ${ip} - Success: ${success} - Reason: ${reason || 'N/A'} - UA: ${userAgent}`);
}
