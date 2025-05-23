
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Improved CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface InvitationRequest {
  email: string;
  companyId: string;
  role: string;
  invitationId?: string;
}

// Helper function to handle CORS preflight requests
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Helper function to create standardized error responses
function createErrorResponse(message: string, status: number = 400, details?: any): Response {
  console.error(`Error: ${message}`, details);
  return new Response(
    JSON.stringify({
      error: message,
      details: details || {}
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

// Helper function to create standardized success responses
function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return createErrorResponse("Server configuration error", 500);
    }

    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY");
      return createErrorResponse(
        "Email service not configured. Contact administrator to set up RESEND_API_KEY.", 
        400
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestData: InvitationRequest;
    try {
      requestData = await req.json();
    } catch (e) {
      return createErrorResponse("Invalid JSON payload", 400);
    }
    
    const { email, companyId, role, invitationId } = requestData;

    if (!email || !companyId || !role) {
      console.error("Missing required parameters:", requestData);
      return createErrorResponse("Missing required parameters", 400);
    }

    console.log("Processing invitation request:", { email, companyId, role, invitationId });

    // Validate role
    if (!["admin", "member", "viewer"].includes(role)) {
      return createErrorResponse("Invalid role", 400);
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, owner_id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      console.error("Company not found:", companyError);
      return createErrorResponse("Company not found", 404);
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
        return createErrorResponse("Invitation not found", 404);
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
        return createErrorResponse("Failed to update invitation", 500);
      }
    } else {
      // Check if an invitation for this email already exists
      const { data: existingInvites, error: checkError } = await supabase
        .from("company_invitations")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", email)
        .eq("status", "pending");
        
      if (existingInvites && existingInvites.length > 0) {
        return createErrorResponse("An invitation for this email already exists", 409);
      }
      
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
        if (createError.message && createError.message.includes("duplicate key")) {
          return createErrorResponse("An invitation for this email already exists", 409);
        }
        
        return createErrorResponse("Failed to create invitation", 500);
      }

      invitation = newInvitation;
    }

    // Generate invitation URL
    const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://app.drscale.ai";
    const inviteUrl = `${baseUrl}/register?token=${invitation.token}`;

    // Check for test mode to skip actual email sending
    const testMode = req.headers.get("x-test-mode") === "true";
    
    if (testMode) {
      console.log("Test mode enabled, skipping email sending");
      return createSuccessResponse({ 
        success: true, 
        message: "Test invitation created successfully", 
        inviteUrl 
      });
    }

    try {
      // Send email using Resend API - use onboarding email during development
      const fromEmail = "invites@resend.dev"; // Using Resend default domain during development
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
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
        
        // Handle domain verification errors with specific message
        if (errorData?.message?.includes("domain is not verified")) {
          return createErrorResponse(
            "Email service domain not verified. Please complete domain verification in Resend.", 
            503, 
            { hint: "Check Resend dashboard to verify the domain." }
          );
        }
        
        return createErrorResponse("Failed to send invitation email", 500);
      }

      const emailData = await response.json();
      console.log("Email sent successfully:", emailData);

      // Return success response
      return createSuccessResponse({ 
        success: true, 
        message: "Invitation sent successfully",
        id: invitation.id
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return createErrorResponse("Failed to send invitation email", 500);
    }
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    
    return createErrorResponse(
      error.message || "An error occurred while sending the invitation",
      500
    );
  }
});
