
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchUserAgentAssignments, 
  removeUserAgentAssignment,
  updateUserAgentAssignmentPrimary,
  UserAgentAssignment 
} from "@/services/agent/userAgentAssignmentQueries";
import { toast } from "sonner";

export function useUserAgentAssignments() {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { 
    data: assignments, 
    isLoading: isLoadingAssignments,
    refetch: refetchAssignments,
    error: assignmentsError
  } = useQuery({
    queryKey: ['user-agent-assignments'],
    queryFn: fetchUserAgentAssignments,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  });

  console.log('🔍 [useUserAgentAssignments] assignments result:', assignments);
  console.log('🔍 [useUserAgentAssignments] assignments length:', assignments?.length);
  console.log('🔍 [useUserAgentAssignments] assignmentsError:', assignmentsError);
  console.log('🔍 [useUserAgentAssignments] isLoadingAssignments:', isLoadingAssignments);

  const handleRemoveAssignment = async (assignmentId: string) => {
    setIsRemoving(true);
    try {
      const success = await removeUserAgentAssignment(assignmentId);
      if (success) {
        toast.success('Assignment removed successfully');
        refetchAssignments();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(`Failed to remove assignment: ${error.message}`);
      return false;
    } finally {
      setIsRemoving(false);
    }
  };

  const handleUpdatePrimary = async (assignmentId: string, isPrimary: boolean, userId: string) => {
    setIsUpdating(true);
    try {
      const success = await updateUserAgentAssignmentPrimary(assignmentId, isPrimary, userId);
      if (success) {
        toast.success(isPrimary ? 'Set as primary agent' : 'Removed primary status');
        refetchAssignments();
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(`Failed to update primary status: ${error.message}`);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    assignments: assignments || [],
    isLoadingAssignments,
    isRemoving,
    isUpdating,
    assignmentsError,
    refetchAssignments,
    handleRemoveAssignment,
    handleUpdatePrimary
  };
}
