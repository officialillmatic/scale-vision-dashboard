
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import type { CompanyInvitation, InvitationCheckResult } from "./types";

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  try {
    const { data, error } = await supabase
      .from("company_invitations_raw")
      .select(`
        *,
        companies!inner(name)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data?.map(invitation => ({
      ...invitation,
      company_name: invitation.companies?.name
    })) || [];
  } catch (error) {
    console.error("Error fetching invitations:", error);
    handleError(error, {
      fallbackMessage: "Failed to fetch invitations"
    });
    return [];
  }
};

export const checkInvitation = async (token: string): Promise<InvitationCheckResult> => {
  try {
    console.log("🔍 Checking invitation with token:", token);
    
    const { data: invitation, error } = await supabase
      .from("company_invitations_raw")
      .select(`
        *,
        companies!inner(id, name)
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error) {
      console.error("❌ Database error:", error);
      return {
        valid: false,
        error: "Invitation not found or expired"
      };
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log("⏰ Invitation has expired");
      return {
        valid: false,
        error: "This invitation has expired"
      };
    }

    console.log("✅ Valid invitation found:", invitation);
    
    return {
      valid: true,
      invitation: {
        ...invitation,
        company_name: invitation.companies?.name
      },
      company: invitation.companies
    };
  } catch (error) {
    console.error("💥 Error checking invitation:", error);
    return {
      valid: false,
      error: "Failed to verify invitation"
    };
  }
};

export const acceptInvitation = async (token: string, userId: string): Promise<boolean> => {
  try {
    console.log("🎯 Accepting invitation...", { token, userId });

    // First, verify the invitation is still valid
    const invitationCheck = await checkInvitation(token);
    if (!invitationCheck.valid) {
      console.error("❌ Cannot accept invalid invitation");
      return false;
    }

    const invitation = invitationCheck.invitation!;

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("company_members")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", invitation.company_id)
      .single();

    if (existingMember) {
      console.log("ℹ️ User is already a member, just updating invitation status");
      // Update invitation status
      await supabase
        .from("company_invitations_raw")
        .update({ status: "accepted" })
        .eq("token", token);
      
      return true;
    }

    // Add user to company
    const { error: memberError } = await supabase
      .from("company_members")
      .insert({
        user_id: userId,
        company_id: invitation.company_id,
        role: invitation.role,
        status: "active",
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      console.error("❌ Error adding user to company:", memberError);
      return false;
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("company_invitations_raw")
      .update({ status: "accepted" })
      .eq("token", token);

    if (updateError) {
      console.error("❌ Error updating invitation status:", updateError);
      // Don't fail here since the user was already added
    }

    console.log("✅ Invitation accepted successfully");
    return true;
  } catch (error) {
    console.error("💥 Error accepting invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to accept invitation"
    });
    return false;
  }
};
