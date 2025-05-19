
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: Date;
  expires_at: Date;
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
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching company invitations:", error);
      return [];
    }

    return data.map(inv => ({
      ...inv,
      created_at: new Date(inv.created_at),
      expires_at: new Date(inv.expires_at)
    }));
  } catch (error) {
    console.error("Error in fetchCompanyInvitations:", error);
    return [];
  }
};

export const checkInvitation = async (token: string): Promise<InvitationCheckResult> => {
  try {
    const { data: invitationData, error: invitationError } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .maybeSingle();

    if (invitationError || !invitationData) {
      console.error("Error checking invitation:", invitationError);
      return { valid: false };
    }

    // Check if invitation has expired
    const expiryDate = new Date(invitationData.expires_at);
    if (expiryDate < new Date()) {
      // Update the invitation status to expired
      await supabase
        .from("company_invitations")
        .update({ status: "expired" })
        .eq("id", invitationData.id);
        
      return { valid: false };
    }

    // Fetch company information
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", invitationData.company_id)
      .single();

    if (companyError || !companyData) {
      console.error("Error fetching company:", companyError);
      return { valid: false };
    }

    const invitation: CompanyInvitation = {
      ...invitationData,
      created_at: new Date(invitationData.created_at),
      expires_at: new Date(invitationData.expires_at)
    };

    return {
      valid: true,
      invitation,
      company: {
        id: companyData.id,
        name: companyData.name
      }
    };
  } catch (error) {
    console.error("Error in checkInvitation:", error);
    return { valid: false };
  }
};

export const acceptInvitation = async (token: string, userId?: string): Promise<boolean> => {
  try {
    // If no userId is provided, use the current user
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("You must be logged in to accept an invitation");
        return false;
      }
      userIdToUse = userData.user.id;
    }

    const { data, error } = await supabase.rpc(
      'accept_invitation',
      { p_token: token, p_user_id: userIdToUse }
    );

    if (error) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
      return false;
    }

    toast.success("Invitation accepted successfully");
    return true;
  } catch (error: any) {
    console.error("Error in acceptInvitation:", error);
    toast.error(error.message || "Failed to accept invitation");
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
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
      return false;
    }

    toast.success("Invitation cancelled successfully");
    return true;
  } catch (error: any) {
    console.error("Error in cancelInvitation:", error);
    toast.error(error.message || "Failed to cancel invitation");
    return false;
  }
};

export const resendInvitation = async (invitationId: string): Promise<boolean> => {
  try {
    // First get the invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from("company_invitations")
      .select("company_id, email, role, token")
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error("Error fetching invitation:", fetchError);
      toast.error("Failed to resend invitation");
      return false;
    }

    // Call the edge function to resend the invitation
    const { error } = await supabase.functions.invoke('send-invitation', {
      body: { 
        companyId: invitation.company_id, 
        email: invitation.email, 
        role: invitation.role as 'admin' | 'member' | 'viewer' 
      }
    });

    if (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
      return false;
    }

    toast.success("Invitation resent successfully");
    return true;
  } catch (error: any) {
    console.error("Error in resendInvitation:", error);
    toast.error(error.message || "Failed to resend invitation");
    return false;
  }
};
