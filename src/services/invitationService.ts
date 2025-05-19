
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
      .eq("company_id", companyId)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching company invitations:", error);
      return [];
    }

    return data.map(invitation => ({
      ...invitation,
      created_at: new Date(invitation.created_at),
      expires_at: new Date(invitation.expires_at)
    }));
  } catch (error) {
    console.error("Error in fetchCompanyInvitations:", error);
    return [];
  }
};

export const inviteTeamMember = async (
  companyId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer'
): Promise<boolean> => {
  try {
    // Get the company name for the email
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error("Error fetching company:", companyError);
      toast.error("Failed to invite team member");
      return false;
    }

    // Get the current user's name if available
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name")
      .eq("id", user?.id || '')
      .maybeSingle();

    const inviterName = userData?.name || user?.email || "The company administrator";

    // Call the edge function to send the invitation
    const { error } = await supabase.functions.invoke("send-invitation", {
      body: {
        email,
        role,
        companyId,
        companyName: companyData.name,
        inviterName
      },
    });

    if (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
      return false;
    }

    toast.success(`Invitation sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error in inviteTeamMember:", error);
    toast.error("Failed to invite team member");
    return false;
  }
};

export const checkInvitation = async (token: string): Promise<{
  valid: boolean;
  invitation?: CompanyInvitation;
  company?: { id: string; name: string; };
}> => {
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

    // Check if invitation has expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired
      await supabase
        .from("company_invitations")
        .update({ status: "expired" })
        .eq("id", data.id);
        
      return { valid: false };
    }

    // Format the invitation data
    const invitation: CompanyInvitation = {
      id: data.id,
      company_id: data.company_id,
      email: data.email,
      role: data.role,
      token: data.token,
      status: data.status,
      created_at: new Date(data.created_at),
      expires_at: expiresAt
    };

    return {
      valid: true,
      invitation,
      company: data.companies
    };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { valid: false };
  }
};

export const acceptInvitation = async (token: string, userId: string): Promise<boolean> => {
  try {
    // Fetch the invitation
    const { data: invitationData, error: invitationError } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invitationError || !invitationData) {
      console.error("Invitation not found or already used");
      return false;
    }

    // Start a transaction by using RPC
    const { error: acceptError } = await supabase.rpc("accept_invitation", {
      p_token: token,
      p_user_id: userId
    });

    if (acceptError) {
      console.error("Error accepting invitation:", acceptError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in acceptInvitation:", error);
    return false;
  }
};
