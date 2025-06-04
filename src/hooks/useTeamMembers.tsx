import { useState, useEffect } from "react";
import { fetchCompanyInvitations, cancelInvitation, resendInvitation, CompanyInvitation, createInvitation } from "@/services/invitation";
import { handleError } from "@/lib/errorHandling";
import { fetchCompanyMembers, CompanyMember } from "@/services/memberService";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

interface UseTeamMembersResult {
  invitations: CompanyInvitation[];
  members: CompanyMember[];
  isLoading: boolean;
  error: string | null;
  fetchInvitations: () => Promise<void>;
  handleCancelInvitation: (invitationId: string) => Promise<void>;
  handleResendInvitation: (invitationId: string) => Promise<void>;
  teamMembers: CompanyMember[];
  isInviting: boolean;
  handleInvite: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>;
}

export const useTeamMembers = (companyId: string | undefined): UseTeamMembersResult => {
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();

  const fetchInvitations = async () => {
    if (!companyId && !isSuperAdmin) {
      console.log("🔍 [useTeamMembers] No company ID and not super admin, skipping invitations");
      setInvitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 [useTeamMembers] Fetching invitations for company:", companyId);
      const invitations = await fetchCompanyInvitations(companyId);
      console.log("🔍 [useTeamMembers] Fetched invitations:", invitations);
      setInvitations(invitations);
    } catch (error) {
      console.error("🔍 [useTeamMembers] Error fetching invitations:", error);
      handleError(error, {
        fallbackMessage: "Failed to fetch invitations",
        logToConsole: true
      });
      setError("Failed to fetch invitations");
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchMembers = async () => {
    if (!companyId && !isSuperAdmin) {
      console.log("🔍 [useTeamMembers] No company ID and not super admin, skipping members");
      setMembers([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔍 [useTeamMembers] Fetching members for company:", companyId);
      const companyMembers = await fetchCompanyMembers(companyId);
      console.log("🔍 [useTeamMembers] Raw members data from service:", companyMembers);
      
      // Additional validation to ensure we only keep valid regular users (no super admins/admins)
      const validRegularUsers = companyMembers.filter(member => {
        const isValid = member && 
          member.user_id && 
          member.user_details && 
          member.user_details.email && 
          member.user_details.email.trim() !== '';
        
        if (!isValid) {
          console.warn("🔍 [useTeamMembers] Filtering out invalid member:", member);
        }
        
        return isValid;
      });
      
      console.log("🔍 [useTeamMembers] Valid regular users after filtering (excluding super admins/admins):", validRegularUsers);
      console.log("🔍 [useTeamMembers] Setting members state with count:", validRegularUsers.length);
      
      setMembers(validRegularUsers);
    } catch (error) {
      console.error("🔍 [useTeamMembers] Error fetching members:", error);
      handleError(error, {
        fallbackMessage: "Failed to fetch team members",
        logToConsole: true
      });
      setMembers([]);
      setError("Failed to fetch team members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔍 [useTeamMembers] Effect triggered - companyId:", companyId, "isSuperAdmin:", isSuperAdmin);
    if (companyId || isSuperAdmin) {
      fetchInvitations();
      fetchMembers();
    } else {
      console.log("🔍 [useTeamMembers] Clearing data - no company access");
      setMembers([]);
      setInvitations([]);
    }
  }, [companyId, isSuperAdmin]);

  const handleCancelInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const success = await cancelInvitation(invitationId);
      if (success) {
        fetchInvitations();
      }
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to cancel invitation",
        logToConsole: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const success = await resendInvitation(invitationId);
      if (success) {
        fetchInvitations();
      }
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to resend invitation",
        logToConsole: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    if (!companyId && !isSuperAdmin) return false;
    
    setIsInviting(true);
    console.log("🎯 [HOOK] useTeamMembers: Inviting", email, "with role", role, "for company", companyId);
    
    try {
      const success = await createInvitation(companyId, email, role);
      console.log("🎯 [HOOK] createInvitation result:", success);
      
      if (success) {
        await fetchInvitations();
      }
      return success;
    } catch (error) {
      console.error("🎯 [HOOK] Error in handleInvite:", error);
      handleError(error, {
        fallbackMessage: "Failed to send invitation",
        logToConsole: true
      });
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  console.log("🔍 [useTeamMembers] Returning data - members count:", members.length, "isLoading:", isLoading);

  return {
    invitations,
    members,
    isLoading,
    error,
    fetchInvitations,
    handleCancelInvitation,
    handleResendInvitation,
    teamMembers: members,
    isInviting,
    handleInvite,
  };
};
