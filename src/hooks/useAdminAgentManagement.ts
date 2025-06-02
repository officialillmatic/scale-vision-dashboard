
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retellAgentSyncService } from '@/services/retell/retellAgentSync';
import { toast } from 'sonner';

export interface AdminAgentState {
  syncStats: any[] | null;
  unassignedAgents: any[] | null;
  isLoading: boolean;
  error: string | null;
  triggerSync: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export function useAdminAgentManagement(): AdminAgentState {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query for sync statistics
  const {
    data: syncStats,
    isLoading: isLoadingSyncStats,
    refetch: refetchSyncStats
  } = useQuery({
    queryKey: ['admin-sync-stats'],
    queryFn: () => retellAgentSyncService.getSyncStats(10),
    refetchInterval: 30000,
    retry: 1,
    staleTime: 30000
  });

  // Query for unassigned agents
  const {
    data: unassignedAgents,
    isLoading: isLoadingUnassigned,
    refetch: refetchUnassigned
  } = useQuery({
    queryKey: ['admin-unassigned-agents'],
    queryFn: () => retellAgentSyncService.getUnassignedAgents(),
    refetchInterval: 60000,
    retry: 1,
    staleTime: 60000
  });

  // Mutation for manual sync
  const syncMutation = useMutation({
    mutationFn: () => retellAgentSyncService.forceSync(),
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unassigned-agents'] });
      toast.success('Agent sync completed successfully');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Sync failed';
      setError(errorMessage);
      toast.error(`Sync failed: ${errorMessage}`);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const triggerSync = async () => {
    if (isLoading) {
      toast.warning('Sync already in progress');
      return;
    }
    
    try {
      syncMutation.mutate();
    } catch (error) {
      console.error('[ADMIN_AGENT_MANAGEMENT] Error triggering sync:', error);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refetchSyncStats(),
        refetchUnassigned()
      ]);
      setError(null);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to refresh data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncStats: syncStats || null,
    unassignedAgents: unassignedAgents || null,
    isLoading: isLoading || isLoadingSyncStats || isLoadingUnassigned,
    error,
    triggerSync,
    refreshData
  };
}
