
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  expires_at: string;
  token: string;
}

export interface InvitationCheckResult {
  valid: boolean;
  invitation?: CompanyInvitation;
  company?: {
    id: string;
    name: string;
  };
}

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data as CompanyInvitation[];
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to fetch company invitations"
    });
    return [];
  }
};

export const checkInvitation = async (token: string): Promise<InvitationCheckResult> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations")
      .select("*, companies:company_id(id, name)")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error || !data) {
      return { valid: false };
    }

    // Check if the invitation has expired
    const expiryDate = new Date(data.expires_at);
    if (expiryDate < new Date()) {
      return { valid: false };
    }

    const company = data.companies as { id: string, name: string };
    delete data.companies;

    return { 
      valid: true, 
      invitation: data as CompanyInvitation,
      company
    };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { valid: false };
  }
};

export const acceptInvitation = async (token: string, userId?: string): Promise<boolean> => {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to accept an invitation");
        return false;
      }
      
      userId = user.id;
    }

    const { data, error } = await supabase.rpc("accept_invitation", {
      p_token: token,
      p_user_id: userId
    });

    if (error) {
      throw error;
    }

    toast.success("Invitation accepted successfully");
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to accept invitation"
    });
    return false;
  }
};

export const cancelInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("company_invitations")
      .update({ status: 'rejected' })
      .eq("id", invitationId);

    if (error) {
      throw error;
    }

    toast.success("Invitation canceled successfully");
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to cancel invitation"
    });
    return false;
  }
};

export const resendInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    // Get the invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      throw fetchError || new Error("Invitation not found");
    }

    // Update the expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await supabase
      .from("company_invitations")
      .update({ 
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        status: 'pending'
      })
      .eq("id", invitationId);

    if (updateError) {
      throw updateError;
    }

    // Trigger the Edge Function to send the email
    const { error: functionError } = await supabase.functions.invoke('send-invitation', {
      body: { invitationId }
    });

    if (functionError) {
      throw functionError;
    }

    toast.success("Invitation resent successfully");
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to resend invitation"
    });
    return false;
  }
};

export const inviteTeamMember = async (companyId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
  // This function has been moved to memberService.ts but is re-exported
  // This is just a stub to avoid circular dependencies
  console.warn("inviteTeamMember has been moved to memberService.ts");
  return false;
};
