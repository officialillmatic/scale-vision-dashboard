
import { useState, useEffect } from "react";
import { fetchCompanyInvitations, cancelInvitation, resendInvitation, CompanyInvitation } from "@/services/invitationService";
import { handleError } from "@/lib/errorHandling";

interface UseTeamMembersResult {
  invitations: CompanyInvitation[];
  isLoading: boolean;
  error: string | null;
  fetchInvitations: () => Promise<void>;
  handleCancelInvitation: (invitationId: string) => Promise<void>;
  handleResendInvitation: (invitationId: string) => Promise<void>;
  // Add missing properties needed by TeamMembers.tsx and TeamAgents.tsx
  teamMembers: any[]; // Adding this placeholder property to prevent TypeScript error
  isInviting: boolean;
  handleInvite: (data: any) => Promise<void>;
}

export const useTeamMembers = (companyId: string | undefined): UseTeamMembersResult => {
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  const fetchInvitations = async () => {
    if (!companyId) return;

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchInvitations();
    }
  }, [companyId]);

  const handleCancelInvitation = async (invitationId: string) => {
    if (!companyId) return;

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
    if (!companyId) return;
    
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

  // Implementation of handle invite needed for TeamMembers.tsx
  const handleInvite = async (data: any) => {
    setIsInviting(true);
    try {
      // This is a placeholder implementation
      console.log("Invite data:", data);
      // In a real implementation, you would call an API to send the invitation
      setIsInviting(false);
      return Promise.resolve();
    } catch (error) {
      setIsInviting(false);
      handleError(error, {
        fallbackMessage: "Failed to send invitation",
        logToConsole: true
      });
      return Promise.reject(error);
    }
  };

  return {
    invitations,
    isLoading,
    error,
    fetchInvitations,
    handleCancelInvitation,
    handleResendInvitation,
    teamMembers,
    isInviting,
    handleInvite,
  };
};
