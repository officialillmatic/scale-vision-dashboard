
import { useState, useEffect } from "react";
import { fetchCompanyInvitations, cancelInvitation, resendInvitation, CompanyInvitation, createInvitation } from "@/services/invitation";
import { handleError } from "@/lib/errorHandling";
import { fetchCompanyMembers, CompanyMember } from "@/services/memberService";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { supabase } from "@/integrations/supabase/client";

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
      setInvitations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get confirmed users first to filter out from invitations
      const { data: confirmedUsers } = await supabase.auth.admin.listUsers();
      const confirmedEmails = confirmedUsers?.users
        ?.filter(user => user.email_confirmed_at !== null)
        ?.map(user => user.email)
        ?.filter(Boolean) || [];
      
      const rawInvitations = await fetchCompanyInvitations(companyId);
      
      // Filter out invitations for users who are already confirmed
      const filteredInvitations = rawInvitations.filter(invitation => {
        return !confirmedEmails.includes(invitation.email);
      });
      
      setInvitations(filteredInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
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
      setMembers([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const companyMembers = await fetchCompanyMembers(companyId);
      setMembers(companyMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
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
    if (companyId || isSuperAdmin) {
      fetchMembers();
      fetchInvitations();
    } else {
      setMembers([]);
      setInvitations([]);
    }
  }, [companyId, isSuperAdmin]);

  const handleCancelInvitation = async (invitationId: string) => {
    setIsLoading(true);
    try {
      const success = await cancelInvitation(invitationId);
      if (success) {
        await fetchInvitations();
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
        await fetchInvitations();
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
    
    try {
      const success = await createInvitation(companyId, email, role);
      
      if (success) {
        await fetchInvitations();
        await fetchMembers();
      }
      return success;
    } catch (error) {
      console.error("Error in handleInvite:", error);
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
