
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
    error: assignmentsError,
    isError
  } = useQuery({
    queryKey: ['user-agent-assignments'],
    queryFn: async () => {
      console.log('🔍 [useUserAgentAssignments] QueryFn called - fetching assignments');
      try {
        const result = await fetchUserAgentAssignments();
        console.log('🔍 [useUserAgentAssignments] QueryFn success - result:', result);
        return result;
      } catch (error) {
        console.error('🔍 [useUserAgentAssignments] QueryFn error:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log('🔍 [useUserAgentAssignments] Query retry attempt:', failureCount, error);
      return failureCount < 2; // Retry up to 2 times
    },
    onError: (error) => {
      console.error('🔍 [useUserAgentAssignments] Query error callback:', error);
      toast.error(`Failed to load assignments: ${error.message}`);
    },
    onSuccess: (data) => {
      console.log('🔍 [useUserAgentAssignments] Query success callback - data:', data);
    }
  });

  console.log('🔍 [useUserAgentAssignments] Hook state:', {
    assignments,
    assignmentsLength: assignments?.length,
    isLoadingAssignments,
    isError,
    assignmentsError
  });

  const handleRemoveAssignment = async (assignmentId: string) => {
    console.log('🔍 [useUserAgentAssignments] Removing assignment:', assignmentId);
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
      console.error('🔍 [useUserAgentAssignments] Remove error:', error);
      toast.error(`Failed to remove assignment: ${error.message}`);
      return false;
    } finally {
      setIsRemoving(false);
    }
  };

  const handleUpdatePrimary = async (assignmentId: string, isPrimary: boolean, userId: string) => {
    console.log('🔍 [useUserAgentAssignments] Updating primary status:', { assignmentId, isPrimary, userId });
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
      console.error('🔍 [useUserAgentAssignments] Update primary error:', error);
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
    isError,
    refetchAssignments,
    handleRemoveAssignment,
    handleUpdatePrimary
  };
}
