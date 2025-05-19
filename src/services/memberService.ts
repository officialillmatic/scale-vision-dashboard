
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
      .eq("company_id", companyId);

    if (error) {
      throw error;
    }

    // For each company member, fetch the user details using the optimized user service
    const userIds = data.map(member => member.user_id);
    const userProfiles = await fetchUserProfiles(userIds);
    
    // Create a map for quick lookup
    const userProfileMap = userProfiles.reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);

    const membersWithDetails = data.map((member) => {
      const userProfile = userProfileMap[member.user_id];
      
      return {
        ...member,
        created_at: new Date(member.created_at),
        updated_at: new Date(member.updated_at),
        user_details: userProfile 
          ? { email: userProfile.email, name: userProfile.name }
          : { email: "Unknown" }
      };
    });

    return membersWithDetails;
  } catch (error) {
    return handleError(error, {
      fallbackMessage: "Failed to fetch company members",
      showToast: false,
      onError: () => []
    });
  }
};

export const inviteTeamMember = async (companyId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
  try {
    // Call the Supabase Edge Function to send the invitation
    const { data, error } = await supabase.functions.invoke('send-invitation', {
      body: { companyId, email, role }
    });
    
    if (error) {
      throw error;
    }

    // We don't need to show a toast here as the edge function now handles sending emails
    // and we will show a toast in the component that called this function
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
      .update({ role })
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
