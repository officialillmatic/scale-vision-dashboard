
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import { InvitationRole } from "./types";

export const createInvitation = async (
  companyId: string,
  email: string,
  role: InvitationRole
): Promise<boolean> => {
  try {
    console.log("Creating invitation via edge function...");
    
    const { data, error } = await supabase.functions.invoke('send-invitation', {
      body: {
        companyId,
        email,
        role
      }
    });

    if (error) {
      throw error;
    }

    console.log("Invitation created successfully:", data);
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
    console.log("Resending invitation via edge function...");
    
    const { data, error } = await supabase.functions.invoke('send-invitation', {
      body: {
        invitationId
      }
    });

    if (error) {
      throw error;
    }

    console.log("Invitation resent successfully:", data);
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
    const { error } = await supabase
      .from("company_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      throw error;
    }

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
    const { error } = await supabase
      .from("company_invitations")
      .delete()
      .eq("id", invitationId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error deleting invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to delete invitation"
    });
    return false;
  }
};
