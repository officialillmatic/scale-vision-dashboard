const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, accept, accept-profile, content-profile',
  'Access-Control-Max-Age': '86400'
};

function createSuccessResponse(data: any): Response {
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

function createErrorResponse(message: string, status: number = 400): Response {
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

interface InvitationRequest {
  email: string;
  token: string;
  role: string;
  company_name?: string;
  invited_by_email?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    console.log('[SEND-INVITATION-EMAIL] Starting email send process with Resend sandbox');
    
    // Get Resend API Key
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[SEND-INVITATION-EMAIL] RESEND_API_KEY not configured');
      return createErrorResponse('Email service not configured', 500);
    }

    // Parse request body
    const body: InvitationRequest = await req.json();
    console.log('[SEND-INVITATION-EMAIL] Request body:', { 
      email: body.email, 
      role: body.role, 
      hasToken: !!body.token 
    });

    if (!body.email || !body.token) {
      return createErrorResponse('Missing required fields: email, token', 400);
    }

    // Create invitation URL
    const invitationUrl = `https://drscaleai.com/accept-invitation?token=${body.token}`;
    
    // Email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to Dr. Scale AI</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; border-radius: 0 0 8px 8px; }
        .role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Dr. Scale AI</h1>
            <p>You're invited to join our team!</p>
        </div>
        
        <div class="content">
            <h2>Hello there! 👋</h2>
            
            <p>You've been invited to join <strong>Dr. Scale AI</strong> as a <span class="role-badge">${body.role}</span>.</p>
            
            <p>Dr. Scale AI is a cutting-edge platform for AI-powered conversations and automation. You'll have access to advanced AI agents and powerful analytics tools.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>✅ Click the button above to accept your invitation</li>
                <li>✅ Complete your account registration</li>
                <li>✅ Start exploring Dr. Scale AI immediately</li>
            </ul>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p><strong>⏰ Important:</strong> This invitation expires in 7 days. Don't miss out!</p>
            </div>
            
            ${body.invited_by_email ? `<p><small>You were invited by: <strong>${body.invited_by_email}</strong></small></p>` : ''}
        </div>
        
        <div class="footer">
            <p>If you have any questions, reply to this email or contact our support team.</p>
            <p>© 2025 Dr. Scale AI. All rights reserved.</p>
            <p style="font-size: 12px; margin-top: 10px;">
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>`;

    const emailText = `
Dr. Scale AI - Team Invitation

Hello!

You've been invited to join Dr. Scale AI as a ${body.role}.

Click here to accept your invitation:
${invitationUrl}

This invitation expires in 7 days.

${body.invited_by_email ? `You were invited by: ${body.invited_by_email}` : ''}

If you have any questions, please contact our support team.

Best regards,
The Dr. Scale AI Team
`;

    // Send email via Resend with SANDBOX EMAIL
    console.log('[SEND-INVITATION-EMAIL] Sending email via Resend sandbox...');
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // ✅ SANDBOX EMAIL - FUNCIONA SIEMPRE
        to: [body.email],
        subject: '🤖 You\'re invited to join Dr. Scale AI!',
        html: emailHtml,
        text: emailText,
        tags: [
          { name: 'category', value: 'invitation' },
          { name: 'role', value: body.role }
        ]
      }),
    });

    const resendData = await resendResponse.json();
    
    if (!resendResponse.ok) {
      console.error('[SEND-INVITATION-EMAIL] Resend error:', resendData);
      return createErrorResponse(`Failed to send email: ${resendData.message || 'Unknown error'}`, 500);
    }

    console.log('[SEND-INVITATION-EMAIL] Email sent successfully via Resend sandbox:', resendData.id);
    
    return createSuccessResponse({
      message: 'Invitation email sent successfully via Resend sandbox',
      email_id: resendData.id,
      recipient: body.email,
      method: 'resend-sandbox'
    });

  } catch (error) {
    console.error('[SEND-INVITATION-EMAIL] Error:', error);
    return createErrorResponse('Failed to send invitation email', 500);
  }
});
