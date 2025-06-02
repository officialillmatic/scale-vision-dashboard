
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retellAgentSyncService } from '@/services/retell/retellAgentSync';
import { toast } from 'sonner';

export function useAgentSync() {
  const queryClient = useQueryClient();

  // Query for sync statistics
  const {
    data: syncStats,
    isLoading: isLoadingSyncStats,
    error: syncStatsError,
    refetch: refetchSyncStats
  } = useQuery({
    queryKey: ['agent-sync-stats'],
    queryFn: () => retellAgentSyncService.getSyncStats(10),
    retry: 2,
    staleTime: 30000
  });

  // Query for unassigned agents
  const {
    data: unassignedAgents,
    isLoading: isLoadingUnassigned,
    refetch: refetchUnassigned
  } = useQuery({
    queryKey: ['unassigned-agents'],
    queryFn: () => retellAgentSyncService.getUnassignedAgents(),
    retry: 1,
    staleTime: 60000
  });

  // Mutation for sync
  const syncMutation = useMutation({
    mutationFn: () => retellAgentSyncService.forceSync(),
    onSuccess: (data) => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['agent-sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-agents'] });
      queryClient.invalidateQueries({ queryKey: ['retell-agents'] });
      
      const totalProcessed = data.agents_created + data.agents_updated;
      toast.success(
        `Sync completed! ${totalProcessed} agents processed (${data.agents_created} created, ${data.agents_updated} updated)`
      );
    },
    onError: (error: any) => {
      console.error('[USE_AGENT_SYNC] Sync error:', error);
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  const refreshStats = () => {
    refetchSyncStats();
    refetchUnassigned();
  };

  const syncNow = () => {
    syncMutation.mutate();
  };

  return {
    // Data
    syncStats,
    unassignedAgents,
    
    // Loading states
    isLoading: isLoadingSyncStats || isLoadingUnassigned || syncMutation.isPending,
    isLoadingSyncStats,
    isLoadingUnassigned,
    isSyncing: syncMutation.isPending,
    
    // Error states
    error: syncStatsError?.message || syncMutation.error?.message,
    
    // Actions
    syncNow,
    refreshStats,
    refetchSyncStats,
    refetchUnassigned
  };
}
