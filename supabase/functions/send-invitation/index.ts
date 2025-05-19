
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";
import { Resend } from "npm:resend@2.0.0";

interface InvitationRequest {
  companyId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Create a Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user info
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication error', details: userError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 }
      );
    }

    // Parse request body
    const { companyId, email, role } = await req.json() as InvitationRequest;

    // Validate inputs
    if (!companyId || !email || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: companyId, email, or role' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be admin, member, or viewer' }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
      );
    }

    // Check if the user is authorized to send invitations for this company (admin or owner)
    const { data: adminCheck, error: adminError } = await supabaseClient.rpc(
      'is_admin_of_company',
      { company_id: companyId }
    );

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ 
          error: 'You must be a company admin to send invitations',
          details: adminError
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 403 }
      );
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvitation, error: inviteCheckError } = await supabaseClient
      .from('company_invitations')
      .select('id, status, expires_at')
      .eq('company_id', companyId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (inviteCheckError && !inviteCheckError.message.includes('No rows found')) {
      return new Response(
        JSON.stringify({ error: 'Error checking existing invitations', details: inviteCheckError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
      );
    }

    // Get company name for email
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();
      
    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found', details: companyError }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 404 }
      );
    }

    let invitationId;
    let token;
    
    if (existingInvitation) {
      // If there's an existing invitation and it hasn't expired yet, don't create a new one
      const expiryDate = new Date(existingInvitation.expires_at);
      if (expiryDate > new Date()) {
        // Send email again with existing invitation
        invitationId = existingInvitation.id;
        
        // Get the token
        const { data: invitationData } = await supabaseClient
          .from('company_invitations')
          .select('token')
          .eq('id', invitationId)
          .single();
          
        token = invitationData?.token;
      } else {
        // If the invitation expired, update it instead of creating a new one
        token = crypto.randomUUID();
        const expiryTimestamp = new Date();
        expiryTimestamp.setDate(expiryTimestamp.getDate() + 7); // Expire in 7 days
        
        const { data, error: updateError } = await supabaseClient
          .from('company_invitations')
          .update({
            role,
            token,
            status: 'pending',
            expires_at: expiryTimestamp.toISOString()
          })
          .eq('id', existingInvitation.id)
          .select('id');
          
        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to update invitation', details: updateError }),
            { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
          );
        }
        
        invitationId = data?.[0]?.id;
      }
    } else {
      // Create a new invitation
      token = crypto.randomUUID();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // Expire in 7 days
  
      const { data, error: insertError } = await supabaseClient
        .from('company_invitations')
        .insert({
          company_id: companyId,
          email,
          role,
          token,
          expires_at: expiryDate.toISOString()
        })
        .select('id');
  
      if (insertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create invitation', details: insertError }),
          { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
        );
      }
      
      invitationId = data?.[0]?.id;
    }

    // Initialize Resend to send the email if API key exists
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        // Get application URL from environment or use a fallback
        const appUrl = Deno.env.get("APP_URL") || "https://echowave.app";
        
        // Generate the invitation link
        const invitationLink = `${appUrl}/register?token=${token}`;
        
        const roleDescription = {
          'admin': 'full access to all features and can manage team members',
          'member': 'can upload calls and use the platform features',
          'viewer': 'can only view calls and reports'
        }[role];
        
        // Send email
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'EchoWave <invites@echowave.app>',
          to: [email],
          subject: `You're invited to join ${company.name} on EchoWave`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You've been invited to join ${company.name}</h2>
              <p>You've been invited to join ${company.name} on EchoWave with the role of <strong>${role}</strong>.</p>
              <p>As a ${role}, you'll have ${roleDescription}.</p>
              <p style="margin: 24px 0;">
                <a href="${invitationLink}" style="background-color: #7e22ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Accept Invitation
                </a>
              </p>
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <p>${invitationLink}</p>
              <p>This invitation will expire in 7 days.</p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #eaeaea;" />
              <p style="color: #666; font-size: 14px;">EchoWave - AI-Powered Call Analytics</p>
            </div>
          `,
        });
        
        if (emailError) {
          console.error("Error sending email:", emailError);
        }
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // We don't want to fail the entire process if just the email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation sent successfully', 
        email,
        token
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 }
    );
  }
});
