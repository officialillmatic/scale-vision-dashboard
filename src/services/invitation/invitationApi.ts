import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import type { CompanyInvitation, InvitationCheckResult } from "./types";
import { getTrulyPendingInvitations } from "@/services/teamMigration";

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  try {
    console.log('🔍 [DEBUG] Fetching truly pending invitations for company:', companyId);
    
    // Use the new migration service to get truly pending invitations
    const trulyPendingInvitations = await getTrulyPendingInvitations(companyId);
    
    console.log('📋 [DEBUG] Final truly pending invitations:', trulyPendingInvitations.length);
    trulyPendingInvitations.forEach(inv => {
      console.log(`   - ${inv.email} (${inv.id}) - SHOWING IN PENDING`);
    });

    return trulyPendingInvitations;
  } catch (error) {
    console.error("💥 [DEBUG] Error in fetchCompanyInvitations:", error);
    handleError(error, {
      fallbackMessage: "Failed to fetch invitations"
    });
    return [];
  }
};

export const checkInvitation = async (token: string): Promise<InvitationCheckResult> => {
  try {
    console.log("🔍 Checking invitation with token:", token);
    
    // First, get the invitation without complex JOIN
    const { data: invitation, error: invitationError } = await supabase
      .from("company_invitations_raw")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invitationError || !invitation) {
      console.error("❌ Invitation not found:", invitationError);
      return {
        valid: false,
        error: "Invitation not found or expired"
      };
    }

    console.log("✅ Invitation found:", invitation);

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log("⏰ Invitation has expired");
      return {
        valid: false,
        error: "This invitation has expired"
      };
    }

    // Separately get company information
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", invitation.company_id)
      .single();

    if (companyError || !company) {
      console.error("❌ Company not found:", companyError);
      return {
        valid: false,
        error: "Company not found"
      };
    }

    console.log("✅ Valid invitation found with company:", company.name);
    
    return {
      valid: true,
      invitation: {
        ...invitation,
        company_name: company.name
      },
      company: company
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
      // Update invitation status to accepted
      await supabase
        .from("company_invitations_raw")
        .update({ 
          status: "accepted",
          accepted_at: new Date().toISOString()
        })
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

    // Update invitation status to accepted
    const { error: updateError } = await supabase
      .from("company_invitations_raw")
      .update({ 
        status: "accepted",
        accepted_at: new Date().toISOString()
      })
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