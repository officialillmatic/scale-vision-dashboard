import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import { InvitationRole } from "./types";

export const createInvitation = async (
  companyId: string,
  email: string,
  role: InvitationRole
): Promise<boolean> => {
  try {
    console.log("Creating invitation...");
    
    // Step 1: Create invitation in database
    const token = crypto.randomUUID();
    
    const { data: invitation, error: dbError } = await supabase
      .from("company_invitations_raw")
      .insert({
        company_id: companyId,
        email: email,
        role: role,
        token: token,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    console.log("Invitation created in database:", invitation);

    // Step 2: Send email via Edge Function
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: email,
        role: role,
        token: token,
        company_id: companyId
      }
    });

    if (emailError) {
      console.error("Email error:", emailError);
      // Don't fail the whole process if email fails, just log it
      console.warn("Invitation created but email failed to send");
    } else {
      console.log("Email sent successfully:", emailData);
    }

    return true;
  } catch (error) {
    console.error("Error creating invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to send invitation"
    });
    return false;
  }
};

export const resendInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    console.log("Resending invitation...");
    
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

    console.log("Invitation resent successfully:", emailData);
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
    console.log("Cancelling invitation:", invitationId);
    
    // Update status to 'cancelled' instead of deleting
    const { error } = await supabase
      .from("company_invitations_raw")
      .update({ status: 'cancelled' })
      .eq("id", invitationId);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Invitation cancelled successfully");
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
    console.log("Deleting invitation:", invitationId);
    
    const { error } = await supabase
      .from("company_invitations_raw")
      .delete()
      .eq("id", invitationId);

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("Invitation deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to delete invitation"
    });
    return false;
  }
};