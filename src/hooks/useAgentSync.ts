
import { useState, useEffect, useCallback } from 'react';
import { retellAgentSyncService, AgentSyncResult } from '@/services/retell/retellAgentSync';
import { toast } from 'sonner';

export interface AgentSyncState {
  syncStats: any[] | null;
  unassignedAgents: any[] | null;
  isLoading: boolean;
  error: string | null;
  syncNow: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useAgentSync(): AgentSyncState {
  const [state, setState] = useState<{
    syncStats: any[] | null;
    unassignedAgents: any[] | null;
    isLoading: boolean;
    error: string | null;
  }>({
    syncStats: null,
    unassignedAgents: null,
    isLoading: false,
    error: null,
  });

  // Fetch sync statistics and unassigned agents
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      console.log('[AGENT_SYNC] Fetching sync data...');

      const [syncStats, unassignedAgents] = await Promise.all([
        retellAgentSyncService.getSyncStats(),
        retellAgentSyncService.getUnassignedAgents(),
      ]);

      setState(prev => ({
        ...prev,
        syncStats,
        unassignedAgents,
        isLoading: false,
        error: null,
      }));

      console.log('[AGENT_SYNC] Successfully loaded data:', {
        syncStatsCount: syncStats.length,
        unassignedCount: unassignedAgents.length,
      });
    } catch (error: any) {
      console.error('[AGENT_SYNC] Error fetching data:', error);
      
      const errorMessage = error.message || 'Failed to load sync data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      if (showLoading) {
        toast.error(`Data fetch failed: ${errorMessage}`);
      }
    }
  }, []);

  // Trigger a new sync
  const syncNow = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('[AGENT_SYNC] Starting manual sync...');
      toast.info('Starting agent synchronization...');
      
      const result: AgentSyncResult = await retellAgentSyncService.forceSync();
      
      console.log('[AGENT_SYNC] Sync completed:', result);
      toast.success(`Sync completed! ${result.agents_created + result.agents_updated} agents processed.`);
      
      // Refresh data after sync
      await fetchData(false);
    } catch (error: any) {
      console.error('[AGENT_SYNC] Sync failed:', error);
      const errorMessage = error.message || 'Sync failed';
      
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      toast.error(`Sync failed: ${errorMessage}`);
    }
  }, [fetchData]);

  // Refresh stats function
  const refreshStats = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    syncStats: state.syncStats,
    unassignedAgents: state.unassignedAgents,
    isLoading: state.isLoading,
    error: state.error,
    syncNow,
    refreshStats,
  };
}
