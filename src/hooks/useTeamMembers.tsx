
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchCompanyMembers, 
  inviteTeamMember,
  CompanyMember 
} from "@/services/memberService";
import { handleError } from "@/lib/errorHandling";

export function useTeamMembers(companyId?: string) {
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const { 
    data: teamMembers, 
    isLoading, 
    refetch,
    error 
  } = useQuery({
    queryKey: ['team-members', companyId],
    queryFn: async () => {
      if (!companyId) {
        return Promise.resolve([]);
      }
      
      try {
        const members = await fetchCompanyMembers(companyId);
        return members;
      } catch (error) {
        handleError(error, {
          fallbackMessage: "Failed to fetch team members",
          showToast: true
        });
        return [];
      }
    },
    enabled: !!companyId,
    retry: 1, // Limit retries to avoid infinite loops if permissions aren't correctly set
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const handleInvite = async (email: string, role: 'admin' | 'member' | 'viewer') => {
    if (!companyId) {
      toast.error("Company ID is required");
      return false;
    }

    setIsInviting(true);
    setInviteError(null);
    
    try {
      const success = await inviteTeamMember(companyId, email, role);
      if (success) {
        toast.success(`Invitation sent to ${email}`);
        refetch();
        return true;
      }
      setInviteError("Failed to send invitation. Please try again.");
      return false;
    } catch (error) {
      const errorMessage = handleError(error, {
        fallbackMessage: "Failed to invite team member",
        returnMessage: true
      });
      setInviteError(errorMessage as string);
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  return {
    teamMembers: teamMembers || [],
    isLoading,
    isInviting,
    inviteError,
    handleInvite,
    error,
    refetch
  };
}
