
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
    console.log("🔍 [memberService] Starting fetch for company:", companyId);

    // First, get all confirmed users from auth.users for reference
    const { data: confirmedUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.warn("🔍 [memberService] Could not fetch auth users data:", authError);
    }

    const confirmedEmails = confirmedUsers?.users
      ?.filter(user => user.email_confirmed_at !== null)
      ?.map(user => user.email)
      ?.filter(Boolean) || [];
    
    console.log("🔍 [memberService] Total confirmed users in auth.users:", confirmedEmails.length);
    console.log("🔍 [memberService] Confirmed emails:", confirmedEmails);

    // Get company members
    const { data: membersData, error: membersError } = await supabase
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
      .eq("status", "active");

    if (membersError) {
      console.error("🔍 [memberService] Error fetching company members:", membersError);
      throw membersError;
    }

    console.log("🔍 [memberService] Raw company members data:", membersData);

    if (!membersData || membersData.length === 0) {
      console.log("🔍 [memberService] No company members found");
      return [];
    }

    // Filter out any members without valid user_id
    const validMembers = membersData.filter(member => {
      if (!member.user_id) {
        console.warn("🔍 [memberService] Filtering out member without user_id:", member);
        return false;
      }
      return true;
    });

    console.log("🔍 [memberService] Valid members after user_id filter:", validMembers);

    // Extract user IDs for batch fetching
    const userIds = validMembers.map(member => member.user_id);
    console.log("🔍 [memberService] Fetching user profiles for IDs:", userIds);
    
    // Fetch user profiles in batch
    const userProfiles = await fetchUserProfiles(userIds);
    console.log("🔍 [memberService] Fetched user profiles:", userProfiles);
    
    // Create a map for quick lookup with proper typing
    const userProfileMap: Record<string, any> = {};
    userProfiles.forEach(profile => {
      if (profile && profile.id && profile.email) {
        userProfileMap[profile.id] = profile;
      } else {
        console.warn("🔍 [memberService] Invalid profile data:", profile);
      }
    });

    console.log("🔍 [memberService] User profile map:", userProfileMap);

    // Create a map of auth users for role checking and email confirmation
    const authUsersMap: Record<string, any> = {};
    confirmedUsers?.users?.forEach(user => {
      if (user.id) {
        authUsersMap[user.id] = user;
      }
    });

    console.log("🔍 [memberService] Auth users map:", authUsersMap);

    // Map members with their user details and filter appropriately
    const membersWithDetails = validMembers
      .map((member) => {
        const userProfile = userProfileMap[member.user_id];
        
        if (!userProfile) {
          console.warn("🔍 [memberService] No user profile found for user_id:", member.user_id);
          return null;
        }

        if (!userProfile.email || userProfile.email.trim() === '') {
          console.warn("🔍 [memberService] User profile missing or empty email:", userProfile);
          return null;
        }

        // Check if user is confirmed in auth.users
        const authUser = authUsersMap[member.user_id];
        const isConfirmed = authUser && authUser.email_confirmed_at !== null;
        
        if (!isConfirmed) {
          console.log("🔍 [memberService] Filtering out unconfirmed user:", userProfile.email);
          return null;
        }

        // Check if user is super admin or admin via auth.users metadata
        const userRole = authUser?.raw_user_meta_data?.role;
        
        // Filter out super admins and admins - only show regular users
        if (userRole === 'super_admin' || userRole === 'admin') {
          console.log(`🔍 [memberService] Filtering out ${userRole} user:`, userProfile.email);
          return null;
        }

        const memberWithDetails: CompanyMember = {
          ...member,
          created_at: new Date(member.created_at),
          updated_at: new Date(member.updated_at),
          user_details: { 
            email: userProfile.email, 
            name: userProfile.name 
          }
        };

        console.log("🔍 [memberService] ✅ Valid confirmed regular user member:", memberWithDetails.user_details?.email);
        return memberWithDetails;
      })
      .filter((member): member is CompanyMember => member !== null);

    console.log("🔍 [memberService] 📊 FINAL SUMMARY:");
    console.log("🔍 [memberService] - Total confirmed users in system:", confirmedEmails.length);
    console.log("🔍 [memberService] - Company members found:", membersData.length);
    console.log("🔍 [memberService] - Valid confirmed regular users:", membersWithDetails.length);
    console.log("🔍 [memberService] - Final members emails:", membersWithDetails.map(m => m.user_details?.email));
    
    // Check for specific missing emails
    const foundEmails = membersWithDetails.map(m => m.user_details?.email).filter(Boolean);
    const expectedEmails = [
      'alexbuenhombre2012@gmail.com',
      'nicolebsalento@gmail.com', 
      'hostingcomotienequesergmail.com',
      'jmdreamsgerencia@gmail.com',
      'pedroalexanderbuenhombre@gmail.com',
      'familiajyn2024@gmail.com',
      'elbazardelasventas@gmail.com'
    ];
    
    const missingEmails = expectedEmails.filter(email => !foundEmails.includes(email));
    if (missingEmails.length > 0) {
      console.warn("🔍 [memberService] ⚠️ MISSING EMAILS from Team Members:", missingEmails);
      
      // Check if missing emails are in confirmed users
      missingEmails.forEach(email => {
        const isConfirmed = confirmedEmails.includes(email);
        console.log(`🔍 [memberService] ${email} - Confirmed: ${isConfirmed}`);
      });
    }
    
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
