import { debugLog } from "@/lib/debug";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/errorHandling";
import type { CompanyInvitation, InvitationCheckResult } from "./types";
import { getTrulyPendingInvitations } from "@/services/teamMigration";

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  try {
    debugLog('🔍 [DEBUG] Fetching truly pending invitations for company:', companyId);
    
    // Use the new migration service to get truly pending invitations
    const trulyPendingInvitations = await getTrulyPendingInvitations(companyId);
    
    debugLog('📋 [DEBUG] Final truly pending invitations:', trulyPendingInvitations.length);
    trulyPendingInvitations.forEach(inv => {
      debugLog(`   - ${inv.email} (${inv.id}) - SHOWING IN PENDING`);
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
    debugLog("🔍 Checking invitation with token:", token);
    
    // Get invitation with company info in a single query using LEFT JOIN
    const { data: result, error: queryError } = await supabase
      .from("company_invitations_raw")
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (queryError || !result) {
      console.error("❌ Invitation not found:", queryError);
      return {
        valid: false,
        error: "Invitation not found or expired"
      };
    }

    debugLog("✅ Invitation found:", result);

    // Check if invitation has expired
    if (new Date(result.expires_at) < new Date()) {
      debugLog("⏰ Invitation has expired");
      return {
        valid: false,
        error: "This invitation has expired"
      };
    }

    // If company info is not available due to RLS, use fallback
    const companyName = result.companies?.name || "Dr. Scale AI";

    debugLog("✅ Valid invitation found with company:", companyName);
    
    return {
      valid: true,
      invitation: {
        ...result,
        company_name: companyName
      },
      company: result.companies || { id: result.company_id, name: companyName }
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
    debugLog("🎯 Accepting invitation...", { token, userId });

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
      debugLog("ℹ️ User is already a member, just updating invitation status");
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

    debugLog("✅ Invitation accepted successfully");
    return true;
  } catch (error) {
    console.error("💥 Error accepting invitation:", error);
    handleError(error, {
      fallbackMessage: "Failed to accept invitation"
    });
    return false;
  }
};