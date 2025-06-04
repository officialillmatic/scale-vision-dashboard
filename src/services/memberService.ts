
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleError } from "@/lib/errorHandling";
import { fetchUserProfile, fetchUserProfiles } from "./userService";

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  created_at: Date;
  updated_at: Date;
  user_details?: {
    email: string;
    name?: string;
  };
}

export const fetchCompanyMembers = async (companyId: string): Promise<CompanyMember[]> => {
  try {
    console.log("🔍 [memberService] Fetching members for company:", companyId);

    const { data, error } = await supabase
      .from("company_members")
      .select(`
        id,
        company_id,
        user_id,
        role,
        status,
        created_at,
        updated_at
      `)
      .eq("company_id", companyId)
      .eq("status", "active"); // Only fetch active members

    if (error) {
      console.error("🔍 [memberService] Error fetching company members:", error);
      throw error;
    }

    console.log("🔍 [memberService] Raw company members data:", data);

    if (!data || data.length === 0) {
      console.log("🔍 [memberService] No company members found");
      return [];
    }

    // For each company member, fetch the user details using the optimized user service
    const userIds = data.map(member => member.user_id).filter(Boolean);
    console.log("🔍 [memberService] Fetching user profiles for IDs:", userIds);
    
    const userProfiles = await fetchUserProfiles(userIds);
    console.log("🔍 [memberService] Fetched user profiles:", userProfiles);
    
    // Create a map for quick lookup
    const userProfileMap = userProfiles.reduce((map, profile) => {
      if (profile && profile.id) {
        map[profile.id] = profile;
      }
      return map;
    }, {} as Record<string, any>);

    console.log("🔍 [memberService] User profile map:", userProfileMap);

    const membersWithDetails = data
      .map((member) => {
        if (!member.user_id) {
          console.warn("🔍 [memberService] Member without user_id:", member);
          return null;
        }

        const userProfile = userProfileMap[member.user_id];
        
        if (!userProfile) {
          console.warn("🔍 [memberService] No user profile found for user_id:", member.user_id);
          return null;
        }

        if (!userProfile.email || userProfile.email.trim() === '') {
          console.warn("🔍 [memberService] User profile missing email:", userProfile);
          return null;
        }

        const memberWithDetails = {
          ...member,
          created_at: new Date(member.created_at),
          updated_at: new Date(member.updated_at),
          user_details: { 
            email: userProfile.email, 
            name: userProfile.name 
          }
        };

        console.log("🔍 [memberService] Member with details:", memberWithDetails);
        return memberWithDetails;
      })
      .filter(Boolean); // Remove null entries

    console.log("🔍 [memberService] Final members with details:", membersWithDetails);
    return membersWithDetails;
  } catch (error) {
    console.error("🔍 [memberService] Error in fetchCompanyMembers:", error);
    handleError(error, {
      fallbackMessage: "Failed to fetch company members",
      showToast: false
    });
    return []; 
  }
};

export const inviteTeamMember = async (companyId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
  try {
    // First check if RESEND_API_KEY is configured in Supabase
    const { data: configCheck, error: configError } = await supabase.functions.invoke('check-email-config');
    
    if (configError) {
      console.error("Error checking email configuration:", configError);
      toast.error("Email configuration error. Please contact your administrator.");
      return false;
    }
    
    if (configCheck && !configCheck.configured) {
      toast.error("Email service not configured. Please contact your administrator to set up the RESEND_API_KEY.");
      console.error("RESEND_API_KEY is not configured in Supabase Edge Function secrets.");
      return false;
    }
    
    // Log detailed info before sending invitation
    console.log("Sending invitation to:", email, "with role:", role, "for company:", companyId);
    
    // Proceed with invitation
    const { data, error } = await supabase.functions.invoke('send-invitation', {
      body: { companyId, email, role }
    });
    
    if (error) {
      console.error("Error sending invitation:", error);
      throw error;
    }
    
    if (data && data.error) {
      console.error("Error in send-invitation function response:", data.error);
      throw new Error(data.error);
    }

    toast.success(`Invitation sent to ${email} successfully`);
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to invite team member"
    });
    return false;
  }
};

export const removeTeamMember = async (memberId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("company_members")
      .delete()
      .eq("id", memberId);
    
    if (error) {
      throw error;
    }

    toast.success("Team member removed successfully");
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to remove team member"
    });
    return false;
  }
};

export const updateTeamMemberRole = async (memberId: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("company_members")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", memberId);
    
    if (error) {
      throw error;
    }

    toast.success("Team member role updated successfully");
    return true;
  } catch (error) {
    handleError(error, {
      fallbackMessage: "Failed to update team member role"
    });
    return false;
  }
};
