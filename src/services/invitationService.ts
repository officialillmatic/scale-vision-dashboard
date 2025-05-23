
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expires_at: string;
  created_at: string;
  invited_by?: string;
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
    // Remove the join with users table that's causing permission issues
    const { data, error } = await supabase
      .from("company_invitations")
      .select(`
        id,
        company_id,
        email,
        role,
        status,
        token,
        expires_at,
        created_at,
        invited_by
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching company invitations:", error);
    handleError(error, {
      fallbackMessage: "Failed to fetch invitations"
    });
    return [];
  }
};

export const checkInvitation = async (token: string): Promise<InvitationCheckResult> => {
  try {
    const { data: invitation, error } = await supabase
      .from("company_invitations")
      .select(`
        id,
        company_id,
        email,
        role,
        status,
        token,
        expires_at,
        created_at,
        companies!inner (
          id,
          name
        )
      `)
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!invitation) {
      return { valid: false };
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        company_id: invitation.company_id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        token: invitation.token,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at
      },
      company: invitation.companies
    };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { valid: false };
  }
};

export const createInvitation = async (
  companyId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer'
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

export const acceptInvitation = async (token: string, userId?: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token,
      p_user_id: userId
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error accepting invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to accept invitation"
    });
    return false;
  }
};
