import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('[SEND-INVITATION-EMAIL] Starting Supabase email send process');
    
    // Get Supabase service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[SEND-INVITATION-EMAIL] Missing Supabase configuration');
      return createErrorResponse('Email service not configured properly', 500);
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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
    console.log('[SEND-INVITATION-EMAIL] Invitation URL:', invitationUrl);

    // Send invitation email using Supabase Auth
    console.log('[SEND-INVITATION-EMAIL] Sending invitation via Supabase Auth...');
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email,
      {
        data: {
          // Custom metadata for the email template
          role: body.role,
          company_name: body.company_name || 'Dr. Scale AI',
          invited_by_email: body.invited_by_email || 'team@drscaleai.com',
          invitation_token: body.token,
          custom_invitation_url: invitationUrl
        },
        redirectTo: invitationUrl
      }
    );

    if (inviteError) {
      console.error('[SEND-INVITATION-EMAIL] Supabase invite error:', inviteError);
      return createErrorResponse(`Failed to send invitation: ${inviteError.message}`, 500);
    }

    console.log('[SEND-INVITATION-EMAIL] Invitation sent successfully via Supabase');
    console.log('[SEND-INVITATION-EMAIL] Invite data:', inviteData);
    
    return createSuccessResponse({
      message: 'Invitation email sent successfully via Supabase',
      email_id: inviteData.user?.id || 'supabase-invite',
      recipient: body.email,
      method: 'supabase-auth'
    });

  } catch (error) {
    console.error('[SEND-INVITATION-EMAIL] Unexpected error:', error);
    return createErrorResponse('Failed to send invitation email', 500);
  }
});
