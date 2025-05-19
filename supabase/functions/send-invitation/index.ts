
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  companyId: string;
  companyName: string;
  inviterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const resendApiKey = Deno.env.get("RESEND_API_KEY") as string;
    
    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error("Missing environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { email, role, companyId, companyName, inviterName } = await req.json() as InvitationRequest;
    
    if (!email || !role || !companyId || !companyName) {
      throw new Error("Missing required parameters");
    }

    // Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId;
    
    if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw userError;
    }

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Generate a temporary user ID - in a real system, this would be created after signup
      userId = crypto.randomUUID();
    }

    // Create an invitation token (valid for 7 days)
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store the invitation in the database
    const { error: inviteError } = await supabase
      .from('company_invitations')
      .insert({
        token: invitationToken,
        email,
        role,
        company_id: companyId,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });
      
    if (inviteError) {
      throw inviteError;
    }

    // Create a signup link with the token
    const signupUrl = new URL('/register', req.url).toString();
    const invitationUrl = `${signupUrl}?token=${invitationToken}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "EchoWave <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${companyName} on EchoWave`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366F1;">Join ${companyName} on EchoWave</h1>
          <p>${inviterName ? `${inviterName} has` : 'You have been'} invited you to join ${companyName} on EchoWave as a ${role}.</p>
          <p>EchoWave is a platform for managing and analyzing customer calls.</p>
          <div style="margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #6366F1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666;">This invitation will expire in 7 days.</p>
          <p style="color: #666;">If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
