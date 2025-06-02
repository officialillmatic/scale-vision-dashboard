
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retellAgentSyncService, SyncStats } from '@/services/retell/retellAgentSync';
import { toast } from 'sonner';

export function useRetellAgentSync() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Query for sync statistics
  const {
    data: syncStats,
    isLoading: isLoadingSyncStats,
    refetch: refetchSyncStats
  } = useQuery({
    queryKey: ['retell-sync-stats'],
    queryFn: () => retellAgentSyncService.getSyncStats(10),
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Query for unassigned agents
  const {
    data: unassignedAgents,
    isLoading: isLoadingUnassigned,
    refetch: refetchUnassigned
  } = useQuery({
    queryKey: ['retell-unassigned-agents'],
    queryFn: () => retellAgentSyncService.getUnassignedAgents(),
    refetchInterval: 60000 // Refetch every minute
  });

  // Mutation for manual sync
  const syncMutation = useMutation({
    mutationFn: () => retellAgentSyncService.forceSync(),
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: (data: SyncStats) => {
      queryClient.invalidateQueries({ queryKey: ['retell-sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['retell-unassigned-agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success(`Sync completed successfully`);
    },
    onError: (error: any) => {
      toast.error(`Sync failed: ${error.message}`);
    },
    onSettled: () => {
      setIsSyncing(false);
    }
  });

  const triggerSync = () => {
    if (isSyncing) {
      toast.warning('Sync already in progress');
      return;
    }
    
    syncMutation.mutate();
  };

  // Get the latest sync status
  const latestSync = syncStats?.[0];
  const isCurrentlyRunning = latestSync?.sync_status === 'running';

  return {
    // Data
    syncStats,
    unassignedAgents,
    latestSync,
    
    // Loading states
    isLoadingSyncStats,
    isLoadingUnassigned,
    isSyncing: isSyncing || isCurrentlyRunning,
    
    // Actions
    triggerSync,
    refetchSyncStats,
    refetchUnassigned,
    
    // Computed states
    isCurrentlyRunning
  };
}
