
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, createSuccessResponse } from "../_shared/corsUtils.ts";
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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Use environment helper for secure env var access
function env(key: string): string {
  const val = Deno?.env?.get?.(key);
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const supabaseServiceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = env("RESEND_API_KEY");
    const baseUrl = env("PUBLIC_APP_URL");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData = await req.json();
    
    console.log("Received invitation request:", requestData);

    // Validate request
    const validation = validateInvitationRequest(requestData);
    if (!validation.isValid) {
      return validation.error!;
    }

    const { email, companyId, role, invitationId } = requestData;
    const currentUserId = await getCurrentUserId(req);

    // Get company details
    const company = await getCompanyDetails(supabase, companyId);

    // Handle resend invitation case
    if (invitationId) {
      console.log("Resending invitation:", invitationId);
      
      const invitation = await getExistingInvitation(supabase, invitationId);
      await updateInvitationExpiry(supabase, invitationId);
      
      // Send email
      await sendInvitationEmail(email, company, invitation, baseUrl, resendApiKey);
      
      return createSuccessResponse({
        message: "Invitation resent successfully",
        invitationId: invitation.id
      });
    }

    // Check for existing pending invitation
    await checkExistingInvitation(supabase, companyId, email);

    // Create new invitation
    const invitation = await createInvitationRecord(supabase, companyId, email, role, currentUserId);

    console.log("Created invitation:", invitation.id);

    // Send email
    await sendInvitationEmail(email, company, invitation, baseUrl, resendApiKey);

    return createSuccessResponse({
      message: "Invitation sent successfully",
      invitationId: invitation.id
    });

  } catch (error) {
    console.error("Send invitation error:", error);
    return createErrorResponse(error.message || "Failed to send invitation", 500);
  }
});
