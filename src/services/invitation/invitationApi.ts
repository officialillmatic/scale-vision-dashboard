import { supabase } from "@/integrations/supabase/client";
import type { CompanyInvitation, InvitationCheckResult } from "./types";

export const fetchCompanyInvitations = async (companyId: string): Promise<CompanyInvitation[]> => {
  console.log("[INVITATION_API] Fetching invitations for company:", companyId);
  
  try {
    // Debug: Check if we can access the table at all
    console.log("[DEBUG] Attempting to fetch from company_invitations_raw...");
    
    const { data, error, count } = await supabase
      .from('company_invitations_raw')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    console.log("[DEBUG] Raw query result:", { data, error, count });

    if (error) {
      console.error("[INVITATION_API] Error fetching invitations:", error);
      
      // Try alternative approach - check if table exists
      const { data: allData, error: allError } = await supabase
        .from('company_invitations_raw')
        .select('id, email, status')
        .limit(1);
        
      console.log("[DEBUG] Alternative query:", { allData, allError });
      
      throw new Error(`Failed to fetch invitations: ${error.message}`);
    }

    console.log("[INVITATION_API] Successfully fetched invitations:", data?.length || 0);
    
    // Filter only pending invitations
    const pendingInvitations = (data || []).filter(inv => inv.status === 'pending');
    console.log("[DEBUG] Pending invitations:", pendingInvitations.length);
    
    // Convert string dates to Date objects for type consistency
    const invitations = pendingInvitations.map(invitation => ({
      ...invitation,
      created_at: new Date(invitation.created_at),
      expires_at: invitation.expires_at ? new Date(invitation.expires_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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
      .from('company_invitations_raw')
      .select(`
        *,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('token', token)
      .eq('status', 'pending') // Solo buscar pending para checkInvitation
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

    // Check if invitation is expired (if expires_at exists)
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log("[INVITATION_API] Invitation has expired");
      return {
        valid: false,
        error: "Invitation has expired"
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
  console.log("🚀 [INVITATION_API] Starting acceptInvitation");
  console.log("🚀 [INVITATION_API] Token:", token);
  console.log("🚀 [INVITATION_API] User ID:", userId);
  
  try {
    // Step 1: Get invitation details
    console.log("📝 [INVITATION_API] Fetching invitation...");
    const { data: invitation, error: fetchError } = await supabase
      .from('company_invitations_raw')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    console.log("📝 [INVITATION_API] Fetch result:", { invitation, fetchError });

    if (fetchError || !invitation) {
      console.error("❌ [INVITATION_API] Invitation not found:", fetchError);
      throw new Error("Invitation not found or expired");
    }

    console.log("✅ [INVITATION_API] Found invitation:", invitation);

    // Step 2: Create company member record
    console.log("👥 [INVITATION_API] Creating company member...");
    console.log("👥 [INVITATION_API] Data to insert:", {
      user_id: userId,
      company_id: invitation.company_id,
      role: invitation.role,
      status: 'active',
      joined_at: new Date().toISOString()
    });

    const { data: memberData, error: memberError } = await supabase
      .from('company_members')
      .insert({
        user_id: userId,
        company_id: invitation.company_id,
        role: invitation.role,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log("👥 [INVITATION_API] Member creation result:", { memberData, memberError });

    if (memberError) {
      console.error("❌ [INVITATION_API] Error creating company member:", memberError);
      throw new Error(`Failed to create company member: ${memberError.message}`);
    }

    console.log("✅ [INVITATION_API] Company member created successfully:", memberData);

    // Step 3: Update invitation status
    console.log("📝 [INVITATION_API] Updating invitation status...");
    const { error: updateError } = await supabase
      .from('company_invitations_raw')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        accepted_by_user_id: userId
      })
      .eq('token', token);

    console.log("📝 [INVITATION_API] Update result:", { updateError });

    if (updateError) {
      console.error("⚠️ [INVITATION_API] Error updating invitation status:", updateError);
      // Don't throw here, member was created successfully
    }

    console.log("🎉 [INVITATION_API] Process completed successfully");
    return true;

  } catch (error) {
    console.error("💥 [INVITATION_API] Error in acceptInvitation:", error);
    throw error;
  }
};