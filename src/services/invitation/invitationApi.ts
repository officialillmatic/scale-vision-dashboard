
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import { CompanyInvitation, InvitationCheckResult } from "./types";

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  try {
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

    // Add robust error handling for company data access
    if (!invitation.companies) {
      console.warn("Invalid invitation data: missing companies", invitation);
      return { valid: false };
    }

    // Safely access the company data from the join result
    const company = Array.isArray(invitation.companies) ? invitation.companies[0] : invitation.companies;

    // Validate company object structure
    if (!company || typeof company !== 'object' || !company.id || !company.name) {
      console.warn("Invalid or malformed company data", { company, invitation });
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
      company: {
        id: company.id,
        name: company.name
      }
    };
  } catch (error) {
    console.error("Error checking invitation:", error);
    return { valid: false };
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
