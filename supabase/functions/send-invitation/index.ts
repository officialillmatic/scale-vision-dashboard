
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, createErrorResponse, createSuccessResponse } from "../_shared/corsUtils.ts";
import { InvitationRequest } from "./types.ts";
import { validateInvitationRequest } from "./validation.ts";
import { getCurrentUserId } from "./auth.ts";
import { 
  getCompanyDetails, 
  checkExistingInvitation, 
  createInvitationRecord, 
  updateInvitationExpiry, 
  getExistingInvitation 
} from "./database.ts";
import { sendInvitationEmail } from "./email.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Check environment variables
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

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current user ID
    const currentUserId = await getCurrentUserId(req);

    // Parse and validate request
    let requestData: InvitationRequest;
    try {
      requestData = await req.json();
    } catch (e) {
      return createErrorResponse("Invalid JSON payload", 400);
    }

    const validation = validateInvitationRequest(requestData);
    if (!validation.isValid) {
      return validation.error!;
    }

    const { email, companyId, role, invitationId } = requestData;

    console.log("Processing invitation request:", { email, companyId, role, invitationId });

    // Get company details
    const company = await getCompanyDetails(supabase, companyId);

    let invitation;

    if (invitationId) {
      // Handle resending existing invitation
      invitation = await getExistingInvitation(supabase, invitationId);
      await updateInvitationExpiry(supabase, invitationId);
    } else {
      // Handle creating new invitation
      await checkExistingInvitation(supabase, companyId, email);
      invitation = await createInvitationRecord(supabase, companyId, email, role, currentUserId);
    }

    // Generate invitation URL
    const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://scale-vision-dashboard-6r-kw-qg-xej-x6-nrr-fd-c-w-s-by-mdam-uzq.vercel.app";

    // Check for test mode
    const testMode = req.headers.get("x-test-mode") === "true";
    
    if (testMode) {
      console.log("Test mode enabled, skipping email sending");
      const inviteUrl = `${baseUrl}/register?token=${invitation.token}`;
      return createSuccessResponse({ 
        success: true, 
        message: "Test invitation created successfully", 
        inviteUrl 
      });
    }

    // Send email
    try {
      await sendInvitationEmail(email, company, invitation, baseUrl, resendApiKey);

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
