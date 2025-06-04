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
    // Get all confirmed users from auth.users
    const { data: allUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw authError;
    }

    // Filter confirmed users and exclude admin
    const confirmedUsers = allUsers?.users?.filter(user => {
      const isConfirmed = user.email_confirmed_at !== null;
      const isNotAdmin = user.email !== 'aiagentsdevelopers@gmail.com';
      const hasEmail = user.email && user.email.trim() !== '';
      
      return isConfirmed && isNotAdmin && hasEmail;
    }) || [];

    // Get user profiles for confirmed users
    const userIds = confirmedUsers.map(user => user.id);
    const userProfiles = await fetchUserProfiles(userIds);

    // Create member objects
    const members: CompanyMember[] = confirmedUsers.map(user => {
      const profile = userProfiles.find(p => p.id === user.id);
      
      return {
        id: `member-${user.id}`,
        company_id: companyId,
        user_id: user.id,
        role: 'member' as const,
        status: 'active' as const,
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at || user.created_at),
        user_details: {
          email: user.email!,
          name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0]
        }
      };
    });

    return members;
  } catch (error) {
    console.error("Error in fetchCompanyMembers:", error);
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
