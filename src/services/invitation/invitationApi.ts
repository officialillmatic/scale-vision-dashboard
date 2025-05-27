
import { supabase } from "@/integrations/supabase/client";
import type { CompanyInvitation, InvitationCheckResult } from "./types";

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  console.log("[INVITATION_API] Fetching invitations for company:", companyId);
  
  try {
    const { data, error } = await supabase
      .from('company_invitations')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[INVITATION_API] Error fetching invitations:", error);
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    console.log("[INVITATION_API] Successfully fetched invitations:", data?.length || 0);
    
    // Convert string dates to Date objects for type consistency
    const invitations = (data || []).map(invitation => ({
      ...invitation,
      created_at: new Date(invitation.created_at),
      expires_at: new Date(invitation.expires_at)
    }));

    return invitations;
  } catch (error) {
    console.error("[INVITATION_API] Unexpected error:", error);
    throw error;
  }
};

export const checkInvitation = async (token: string): Promise<InvitationCheckResult> => {
  console.log("[INVITATION_API] Checking invitation with token:", token);
  
  try {
    const { data, error } = await supabase
      .from('company_invitations')
      .select(`
        *,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("[INVITATION_API] Error checking invitation:", error);
      return {
        valid: false,
        error: `Database error: ${error.message}`
      };
    }

    if (!data) {
      console.log("[INVITATION_API] Invitation not found or expired");
      return {
        valid: false,
        error: "Invitation not found or has expired"
      };
    }

    console.log("[INVITATION_API] Valid invitation found for company:", data.companies?.name);
    return {
      valid: true,
      invitation: {
        id: data.id,
        company_id: data.company_id,
        email: data.email,
        role: data.role as 'admin' | 'member' | 'viewer',
        token: data.token,
        status: data.status,
        created_at: data.created_at,
        expires_at: data.expires_at,
        company_name: data.companies?.name || 'Unknown Company'
      }
    };
  } catch (error) {
    console.error("[INVITATION_API] Unexpected error:", error);
    return {
      valid: false,
      error: "An unexpected error occurred while checking the invitation"
    };
  }
};

export const acceptInvitation = async (token: string, userId: string): Promise<boolean> => {
  console.log("[INVITATION_API] Accepting invitation for user:", userId);
  
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_token: token,
      p_user_id: userId
    });

    if (error) {
      console.error("[INVITATION_API] Error accepting invitation:", error);
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }

    console.log("[INVITATION_API] Invitation accepted successfully:", data);
    return data === true;
  } catch (error) {
    console.error("[INVITATION_API] Unexpected error:", error);
    throw error;
  }
};
