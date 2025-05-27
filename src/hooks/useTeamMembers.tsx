
import { useState, useEffect } from "react";
import { fetchCompanyInvitations, cancelInvitation, resendInvitation, CompanyInvitation } from "@/services/invitation";
import { handleError } from "@/lib/errorHandling";
import { fetchCompanyMembers, CompanyMember, inviteTeamMember } from "@/services/memberService";
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
    // Super admins can operate without a specific company - fetch global invitations
    if (!companyId && !isSuperAdmin) {
      setInvitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const invitations = await fetchCompanyInvitations(companyId);
      setInvitations(invitations);
    } catch (error) {
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
    // Super admins can operate without a specific company - fetch all members
    if (!companyId && !isSuperAdmin) {
      setMembers([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const companyMembers = await fetchCompanyMembers(companyId);
      setMembers(companyMembers);
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to fetch team members",
        logToConsole: true
      });
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always allow super admins to fetch data, even without a company
    if (companyId || isSuperAdmin) {
      fetchInvitations();
      fetchMembers();
    }
  }, [companyId, isSuperAdmin]);

  const handleCancelInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const success = await cancelInvitation(invitationId);
      if (success) {
        // Refresh invitations list
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
        // Refresh invitations list
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

  // Direct implementation of handle invite using imported function
  const handleInvite = async (email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    // Super admins can invite to any company or create global invitations
    if (!companyId && !isSuperAdmin) return false;
    
    setIsInviting(true);
    console.log("useTeamMembers: Inviting", email, "with role", role, "for company", companyId);
    try {
      // Use the inviteTeamMember service function directly from memberService
      const success = await inviteTeamMember(companyId, email, role);
      if (success) {
        // Refresh invitations list on success
        await fetchInvitations();
      }
      return success;
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to send invitation",
        logToConsole: true
      });
      return false;
    } finally {
      setIsInviting(false);
    }
  };

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
