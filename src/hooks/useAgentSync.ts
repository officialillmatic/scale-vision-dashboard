
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { retellAgentSyncService, SyncStats } from '@/services/retell/retellAgentSync';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface AgentSyncState {
  syncStats: SyncStats[];
  unassignedAgents: any[];
  isLoading: boolean;
  error: string | null;
}

interface AdminAgentState {
  allAgents: any[];
  isLoadingAgents: boolean;
  agentError: string | null;
}

// Hook for agent synchronization with real-time updates
export function useAgentSync() {
  const [state, setState] = useState<AgentSyncState>({
    syncStats: [],
    unassignedAgents: [],
    isLoading: false,
    error: null
  });
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sync statistics
  const fetchSyncStats = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const stats = await retellAgentSyncService.getSyncStats(10);
      setState(prev => ({ ...prev, syncStats: stats, isLoading: false }));
    } catch (error: any) {
      console.error('[AGENT_SYNC] Error fetching sync stats:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
    }
  }, []);

  // Fetch unassigned agents
  const fetchUnassignedAgents = useCallback(async () => {
    try {
      const agents = await retellAgentSyncService.getUnassignedAgents();
      setState(prev => ({ ...prev, unassignedAgents: agents }));
    } catch (error: any) {
      console.error('[AGENT_SYNC] Error fetching unassigned agents:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, []);

  // Trigger manual sync
  const syncNow = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await retellAgentSyncService.forceSync();
      
      // Refresh data after sync
      await Promise.all([fetchSyncStats(), fetchUnassignedAgents()]);
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      console.error('[AGENT_SYNC] Manual sync failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }));
      toast.error(`Sync failed: ${error.message}`);
    }
  }, [fetchSyncStats, fetchUnassignedAgents]);

  // Refresh all stats
  const refreshStats = useCallback(async () => {
    await Promise.all([fetchSyncStats(), fetchUnassignedAgents()]);
  }, [fetchSyncStats, fetchUnassignedAgents]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Create channel for real-time updates
    channelRef.current = supabase
      .channel('agent-sync-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'retell_sync_stats'
        },
        (payload) => {
          console.log('[AGENT_SYNC] Sync stats updated:', payload);
          fetchSyncStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'retell_agents'
        },
        (payload) => {
          console.log('[AGENT_SYNC] Retell agents updated:', payload);
          fetchUnassignedAgents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_agents'
        },
        (payload) => {
          console.log('[AGENT_SYNC] User agents updated:', payload);
          fetchUnassignedAgents();
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchSyncStats, fetchUnassignedAgents]);

  // Set up auto-refresh every 5 minutes
  useEffect(() => {
    // Initial fetch
    refreshStats();

    // Set up 5-minute interval
    refreshIntervalRef.current = setInterval(() => {
      console.log('[AGENT_SYNC] Auto-refreshing data...');
      refreshStats();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [refreshStats]);

  return {
    syncStats: state.syncStats,
    unassignedAgents: state.unassignedAgents,
    isLoading: state.isLoading,
    error: state.error,
    syncNow,
    refreshStats
  };
}

// Hook for admin agent management operations
export function useAdminAgentManagement() {
  const [state, setState] = useState<AdminAgentState>({
    allAgents: [],
    isLoadingAgents: false,
    agentError: null
  });
  
  const adminChannelRef = useRef<RealtimeChannel | null>(null);

  // Load all agents (admin view)
  const loadAllAgents = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoadingAgents: true, agentError: null }));
      
      const { data: agents, error } = await supabase
        .from('retell_agents')
        .select('*')
        .order('name');

      if (error) throw error;

      setState(prev => ({ 
        ...prev, 
        allAgents: agents || [], 
        isLoadingAgents: false 
      }));
    } catch (error: any) {
      console.error('[ADMIN_AGENT] Error loading all agents:', error);
      setState(prev => ({ 
        ...prev, 
        agentError: error.message, 
        isLoadingAgents: false 
      }));
    }
  }, []);

  // Assign agent to user
  const assignAgent = useCallback(async (agentId: string, userId: string, companyId: string, isPrimary: boolean = false) => {
    try {
      const { error } = await supabase
        .from('user_agents')
        .insert({
          user_id: userId,
          agent_id: agentId,
          company_id: companyId,
          is_primary: isPrimary
        });

      if (error) throw error;

      toast.success('Agent assigned successfully');
      await loadAllAgents(); // Refresh agents list
      return true;
    } catch (error: any) {
      console.error('[ADMIN_AGENT] Error assigning agent:', error);
      toast.error(`Failed to assign agent: ${error.message}`);
      return false;
    }
  }, [loadAllAgents]);

  // Unassign agent from user
  const unassignAgent = useCallback(async (userAgentId: string) => {
    try {
      const { error } = await supabase
        .from('user_agents')
        .delete()
        .eq('id', userAgentId);

      if (error) throw error;

      toast.success('Agent unassigned successfully');
      await loadAllAgents(); // Refresh agents list
      return true;
    } catch (error: any) {
      console.error('[ADMIN_AGENT] Error unassigning agent:', error);
      toast.error(`Failed to unassign agent: ${error.message}`);
      return false;
    }
  }, [loadAllAgents]);

  // Set up real-time subscriptions for admin operations
  useEffect(() => {
    adminChannelRef.current = supabase
      .channel('admin-agent-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'retell_agents'
        },
        (payload) => {
          console.log('[ADMIN_AGENT] Retell agents updated:', payload);
          loadAllAgents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_agents'
        },
        (payload) => {
          console.log('[ADMIN_AGENT] User agent assignments updated:', payload);
          loadAllAgents();
        }
      )
      .subscribe();

    return () => {
      if (adminChannelRef.current) {
        supabase.removeChannel(adminChannelRef.current);
        adminChannelRef.current = null;
      }
    };
  }, [loadAllAgents]);

  // Initial load
  useEffect(() => {
    loadAllAgents();
  }, [loadAllAgents]);

  return {
    allAgents: state.allAgents,
    isLoadingAgents: state.isLoadingAgents,
    agentError: state.agentError,
    assignAgent,
    unassignAgent,
    loadAllAgents
  };
}
