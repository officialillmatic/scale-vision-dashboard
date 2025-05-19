
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

export const checkInvitation = async (token: string): Promise<CompanyInvitation | null> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error) {
      console.error("Error checking invitation:", error);
      return null;
    }

    return {
      ...data,
      created_at: new Date(data.created_at),
      expires_at: new Date(data.expires_at)
    };
  } catch (error) {
    console.error("Error in checkInvitation:", error);
    return null;
  }
};

export const acceptInvitation = async (token: string): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("You must be logged in to accept an invitation");
      return false;
    }

    const { data, error } = await supabase.rpc(
      'accept_invitation',
      { p_token: token, p_user_id: userData.user.id }
    );

    if (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation");
      return false;
    }

    toast.success("Invitation accepted successfully");
    return true;
  } catch (error) {
    console.error("Error in acceptInvitation:", error);
    toast.error("Failed to accept invitation");
    return false;
  }
};
