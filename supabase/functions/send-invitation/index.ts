
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/corsUtils.ts";

interface InvitationRequest {
  email: string;
  companyId: string;
  role: string;
  invitationId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      throw new Error("Server configuration error");
    }

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ 
          error: "Email service not configured. Contact administrator to set up RESEND_API_KEY." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestData: InvitationRequest = await req.json();
    const { email, companyId, role, invitationId } = requestData;

    if (!email || !companyId || !role) {
      console.error("Missing required parameters:", requestData);
      throw new Error("Missing required parameters");
    }

    console.log("Processing invitation request:", { email, companyId, role, invitationId });

    // Validate role
    if (!["admin", "member", "viewer"].includes(role)) {
      throw new Error("Invalid role");
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, owner_id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      console.error("Company not found:", companyError);
      throw new Error("Company not found");
    }

    let invitation;

    // If invitationId is provided, get existing invitation details
    if (invitationId) {
      const { data: existingInvitation, error: invitationError } = await supabase
        .from("company_invitations")
        .select("*")
        .eq("id", invitationId)
        .single();

      if (invitationError) {
        console.error("Error fetching invitation:", invitationError);
        throw new Error("Invitation not found");
      }

      invitation = existingInvitation;

      // Update expiry date (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Update invitation
      const { error: updateError } = await supabase
        .from("company_invitations")
        .update({
          expires_at: expiresAt.toISOString(),
          status: "pending"
        })
        .eq("id", invitationId);

      if (updateError) {
        console.error("Error updating invitation:", updateError);
        throw new Error("Failed to update invitation");
      }
    } else {
      // Create a new invitation
      // Generate a token and expiration date (7 days from now)
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation record
      const { data: newInvitation, error: createError } = await supabase
        .from("company_invitations")
        .insert({
          company_id: companyId,
          email,
          role,
          token,
          expires_at: expiresAt.toISOString(),
          status: "pending"
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating invitation:", createError);
        
        // Check if it's a duplicate invitation
        if (createError.message.includes("duplicate key")) {
          return new Response(
            JSON.stringify({
              error: "An invitation for this email already exists"
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        throw new Error("Failed to create invitation");
      }

      invitation = newInvitation;
    }

    // Generate invitation URL
    const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://app.drscale.ai";
    const inviteUrl = `${baseUrl}/register?token=${invitation.token}`;

    // Send email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "invites@drscale.ai",
        to: email,
        subject: `You've been invited to join ${company.name} on Dr. Scale`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You've been invited to join ${company.name}</h2>
            <p>You've been invited to join ${company.name} as a ${role} on Dr. Scale, the AI sales call analysis platform.</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p>This invitation will expire in 7 days.</p>
            <p>If you have trouble with the button above, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #666;">${inviteUrl}</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eaeaea;" />
            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send email:", errorData);
      throw new Error("Failed to send invitation email");
    }

    const emailData = await response.json();
    console.log("Email sent successfully:", emailData);

    // Return success response
    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while sending the invitation"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
