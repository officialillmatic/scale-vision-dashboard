
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

  const { 
    data: teamMembers, 
    isLoading, 
    refetch,
    error 
  } = useQuery({
    queryKey: ['team-members', companyId],
    queryFn: () => companyId ? fetchCompanyMembers(companyId) : Promise.resolve([]),
    enabled: !!companyId,
    retry: 1 // Limit retries to avoid infinite loops if permissions aren't correctly set
  });

  const handleInvite = async (email: string, role: 'admin' | 'member' | 'viewer') => {
    if (!companyId) {
      toast.error("Company ID is required");
      return false;
    }

    setIsInviting(true);
    try {
      const success = await inviteTeamMember(companyId, email, role);
      if (success) {
        toast.success(`Invitation sent to ${email}`);
        refetch();
        return true;
      }
      return false;
    } catch (error) {
      handleError(error, {
        fallbackMessage: "Failed to invite team member"
      });
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  return {
    teamMembers: teamMembers || [],
    isLoading,
    isInviting,
    handleInvite,
    error
  };
}
