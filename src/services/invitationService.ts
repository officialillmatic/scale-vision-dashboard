
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

export const checkInvitation = async (token: string): Promise<{ valid: boolean, invitation?: CompanyInvitation }> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations")
      .select("*")
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

    return { valid: true, invitation: data as CompanyInvitation };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { valid: false };
  }
};

export const acceptInvitation = async (token: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("You must be logged in to accept an invitation");
      return false;
    }

    const { data, error } = await supabase.rpc("accept_invitation", {
      p_token: token,
      p_user_id: user.id
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

export const inviteTeamMember = async (companyId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
  // This function has been moved to memberService.ts but is re-exported
  // This is just a stub to avoid circular dependencies
  console.warn("inviteTeamMember has been moved to memberService.ts");
  return false;
};
