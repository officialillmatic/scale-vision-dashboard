import { debugLog } from "@/lib/debug";

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
      debugLog('🔍 [useUserAgentAssignments] QueryFn called - fetching assignments');
      try {
        const result = await fetchUserAgentAssignments();
        debugLog('🔍 [useUserAgentAssignments] QueryFn success - result:', result?.length || 0, 'assignments');
        return result;
      } catch (error) {
        console.error('🔍 [useUserAgentAssignments] QueryFn error:', error);
        throw error;
      }
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      debugLog('🔍 [useUserAgentAssignments] Query retry attempt:', failureCount, error);
      return failureCount < 2;
    }
  });

  // Query for available users with improved error handling
  const { 
    data: availableUsers, 
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['assignment-users'],
    queryFn: async () => {
      debugLog('🔍 [useUserAgentAssignments] Fetching users for assignments');
      try {
        const users = await fetchAvailableUsers();
        debugLog('🔍 [useUserAgentAssignments] Users fetched successfully:', users.length);
        return users;
      } catch (error) {
        console.error('🔍 [useUserAgentAssignments] Error fetching users:', error);
        toast.error('Failed to load users for assignment');
        throw error;
      }
    },
    staleTime: 60000,
    retry: (failureCount, error) => {
      debugLog('🔍 [useUserAgentAssignments] Users query retry:', failureCount, error);
      return failureCount < 3; // Retry up to 3 times for user loading
    },
    refetchOnWindowFocus: true
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

  debugLog('🔍 [useUserAgentAssignments] Hook state:', {
    assignmentsCount: assignments?.length || 0,
    isLoadingAssignments,
    isError,
    assignmentsError: assignmentsError?.message,
    availableUsersCount: availableUsers?.length || 0,
    availableAgentsCount: availableAgents?.length || 0,
    isLoadingUsers,
    usersError: usersError?.message
  });

  // Show user-friendly error if users failed to load
  if (usersError) {
    console.error('🔍 [useUserAgentAssignments] Users loading failed:', usersError);
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    debugLog('🔍 [useUserAgentAssignments] Removing assignment:', assignmentId);
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
    debugLog('🔍 [useUserAgentAssignments] Updating primary status:', { assignmentId, isPrimary, userId });
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
    debugLog('🔍 [useUserAgentAssignments] Creating assignment:', { userId, agentId, isPrimary });
    createMutation.mutate({ userId, agentId, isPrimary });
  };

  const handleRefreshUsers = () => {
    debugLog('🔍 [useUserAgentAssignments] Manual refresh of users triggered');
    refetchUsers();
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
    isCreating: createMutation.isPending,
    
    // Error handling and refresh
    usersError,
    handleRefreshUsers
  };
}
