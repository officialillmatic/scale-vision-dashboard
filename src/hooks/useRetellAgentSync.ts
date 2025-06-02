
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retellAgentSyncService, SyncStats, AgentSyncResult } from '@/services/retell/retellAgentSync';
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
      toast.info('Starting agent synchronization...');
    },
    onSuccess: (data: AgentSyncResult) => {
      queryClient.invalidateQueries({ queryKey: ['retell-sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['retell-unassigned-agents'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      
      const totalProcessed = data.agents_created + data.agents_updated;
      toast.success(
        `Sync completed successfully! ${totalProcessed} agents processed (${data.agents_created} created, ${data.agents_updated} updated, ${data.agents_deactivated} deactivated)`
      );
    },
    onError: (error: any) => {
      console.error('[USE_RETELL_AGENT_SYNC] Sync error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'Sync failed';
      if (error.message.includes('Authentication required')) {
        errorMessage = 'Please log in to sync agents';
      } else if (error.message.includes('API connection failed')) {
        errorMessage = 'Failed to connect to Retell AI. Check your API key configuration.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = `Sync failed: ${error.message}`;
      }
      
      toast.error(errorMessage);
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
