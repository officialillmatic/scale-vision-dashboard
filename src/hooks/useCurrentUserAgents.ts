
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUserAgentAssignments, UserAgentAssignment } from "@/services/agent/userAgentAssignmentQueries";
import { useAuth } from "@/contexts/AuthContext";

export function useCurrentUserAgents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user-agent-assignments', user?.id],
    queryFn: async (): Promise<UserAgentAssignment[]> => {
      if (!user?.id) {
        console.log('🔍 [useCurrentUserAgents] No user authenticated');
        return [];
      }

      console.log('🔍 [useCurrentUserAgents] Fetching assignments for user:', user.id);
      return await fetchCurrentUserAgentAssignments();
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log('🔍 [useCurrentUserAgents] Query retry attempt:', failureCount, error);
      return failureCount < 2;
    }
  });
}
