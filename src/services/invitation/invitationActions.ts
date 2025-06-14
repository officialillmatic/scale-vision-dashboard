import { debugLog } from "@/lib/debug";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import { InvitationRole } from "./types";

export const createInvitation = async (
  companyId: string,
  email: string,
  role: InvitationRole
): Promise<boolean> => {
  try {
    debugLog("🚀 [CREATE_INVITATION] Starting...", { companyId, email, role });
    
    // Step 1: Create invitation in database
    debugLog("📝 [DATABASE] Creating token...");
    const token = crypto.randomUUID();
    debugLog("📝 [DATABASE] Token created:", token);
    
    debugLog("📝 [DATABASE] Inserting into company_invitations_raw...");
    const { data: invitation, error: dbError } = await supabase
      .from("company_invitations_raw")
      .insert({
        company_id: companyId,
        email: email,
        role: role,
        token: token,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    debugLog("📝 [DATABASE] Insert result:", { invitation, dbError });

    if (dbError) {
      console.error("❌ [DATABASE] Error:", dbError);
      throw dbError;
    }

    debugLog("✅ [DATABASE] Invitation created successfully:", invitation);

    // Step 2: Send email via Edge Function
    debugLog("📧 [EMAIL] About to call Edge Function...");
    debugLog("📧 [EMAIL] Payload:", {
      email: email,
      role: role,
      token: token,
      company_id: companyId
    });
    
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: email,
        role: role,
        token: token,
        company_id: companyId
      }
    });

    debugLog("📧 [EMAIL] Edge Function response:", { emailData, emailError });

    if (emailError) {
      console.error("❌ [EMAIL] Error:", emailError);
      console.warn("⚠️ [EMAIL] Invitation created but email failed to send");
    } else {
      debugLog("✅ [EMAIL] Email sent successfully:", emailData);
    }

    debugLog("🎉 [CREATE_INVITATION] Process completed successfully");
    return true;
  } catch (error) {
    console.error("💥 [CREATE_INVITATION] Unexpected error:", error);
    handleError(error, {
      fallbackMessage: "Failed to send invitation"
    });
    return false;
  }
};

export const resendInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    debugLog("Resending invitation...");
    
    // Step 1: Get invitation details from database
    const { data: invitation, error: fetchError } = await supabase
      .from("company_invitations_raw")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      throw new Error("Invitation not found");
    }

    // Step 2: Send email via Edge Function
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        company_id: invitation.company_id
      }
    });

    if (emailError) {
      throw emailError;
    }

    debugLog("Invitation resent successfully:", emailData);
    return true;
  } catch (error) {
    console.error("Error resending invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to resend invitation"
    });
    return false;
  }
};

export const cancelInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    debugLog("Cancelling invitation:", invitationId);
    
    // Update status to 'cancelled' instead of deleting
    const { error } = await supabase
      .from("company_invitations_raw")
      .update({ status: 'expired' })
      .eq("id", invitationId);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    debugLog("Invitation cancelled successfully");
    return true;
  } catch (error) {
    console.error("Error canceling invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to cancel invitation"
    });
    return false;
  }
};

export const deleteInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    debugLog("Deleting invitation:", invitationId);
    
    const { error } = await supabase
      .from("company_invitations_raw")
      .delete()
      .eq("id", invitationId);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    debugLog("Invitation deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to delete invitation"
    });
    return false;
  }
};