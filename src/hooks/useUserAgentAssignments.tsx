
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchUserAgentAssignments, 
  removeUserAgentAssignment,
  updateUserAgentAssignmentPrimary,
  createUserAgentAssignment,
  UserAgentAssignment 
} from "@/services/agent/userAgentAssignmentQueries";
import { fetchAvailableUsers, fetchAvailableAgents } from "@/services/agent/assignmentHelpers";
import { toast } from "sonner";

export function useUserAgentAssignments() {
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Query for assignments
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
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log('🔍 [useUserAgentAssignments] Query retry attempt:', failureCount, error);
      return failureCount < 2;
    }
  });

  // Query for available users
  const { 
    data: availableUsers, 
    isLoading: isLoadingUsers 
  } = useQuery({
    queryKey: ['assignment-users'],
    queryFn: fetchAvailableUsers,
    staleTime: 60000
  });

  // Query for available agents
  const { 
    data: availableAgents, 
    isLoading: isLoadingAgents 
  } = useQuery({
    queryKey: ['assignment-agents'],
    queryFn: fetchAvailableAgents,
    staleTime: 60000
  });

  // Mutation for creating assignments
  const createMutation = useMutation({
    mutationFn: ({ userId, agentId, isPrimary }: { userId: string; agentId: string; isPrimary: boolean }) =>
      createUserAgentAssignment(userId, agentId, isPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agent-assignments'] });
      toast.success('Assignment created successfully');
    },
    onError: (error: any) => {
      console.error('🔍 [useUserAgentAssignments] Create error:', error);
      toast.error(`Failed to create assignment: ${error.message}`);
    }
  });

  console.log('🔍 [useUserAgentAssignments] Hook state:', {
    assignments,
    assignmentsLength: assignments?.length,
    isLoadingAssignments,
    isError,
    assignmentsError,
    availableUsers: availableUsers?.length,
    availableAgents: availableAgents?.length
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

  const handleCreateAssignment = async (userId: string, agentId: string, isPrimary: boolean = false) => {
    console.log('🔍 [useUserAgentAssignments] Creating assignment:', { userId, agentId, isPrimary });
    createMutation.mutate({ userId, agentId, isPrimary });
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
    handleUpdatePrimary,
    handleCreateAssignment,
    
    // Data for creating new assignments
    availableUsers: availableUsers || [],
    availableAgents: availableAgents || [],
    isLoadingUsers,
    isLoadingAgents,
    isCreating: createMutation.isPending
  };
}
