import { debugLog } from "@/lib/debug";
import { useState, useEffect, useCallback, useRef } from 'react';
import { retellService, DashboardMetrics, RetellCall, TimeBasedCallData, AgentMetrics } from '@/lib/retellService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types for hook return values
export interface RetellDataState {
  metrics: DashboardMetrics | null;
  calls: RetellCall[];
  timeData: TimeBasedCallData[];
  agentMetrics: AgentMetrics | null;
  loading: boolean;
  error: string | null;
  agentId: string | null;
  refreshData: () => Promise<void>;
  syncCalls: () => Promise<void>;
}

export interface RetellAnalyticsState {
  calls: RetellCall[];
  timeData: TimeBasedCallData[];
  metrics: AgentMetrics | null;
  loading: boolean;
  error: string | null;
  refreshData: (startDate?: Date, endDate?: Date) => Promise<void>;
}

// Main hook for Retell data management
export function useRetellData(): RetellDataState {
  const { user } = useAuth();
  const [state, setState] = useState<{
    metrics: DashboardMetrics | null;
    calls: RetellCall[];
    timeData: TimeBasedCallData[];
    agentMetrics: AgentMetrics | null;
    loading: boolean;
    error: string | null;
    agentId: string | null;
  }>({
    metrics: null,
    calls: [],
    timeData: [],
    agentMetrics: null,
    loading: false,
    error: null,
    agentId: null,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Fetch all data for the dashboard
  const fetchData = useCallback(async (showLoading = true) => {
    if (!user?.id || isUnmountedRef.current) {
      debugLog('[RETELL_DATA] No user or component unmounted, skipping fetch');
      return;
    }

    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      debugLog('[RETELL_DATA] Fetching dashboard data for user:', user.id);

      // Get user's primary agent first
      const userAgent = await retellService.getUserAgent(user.id);
      const agentId = userAgent?.retell_agents?.retell_agent_id || null;

      if (!agentId) {
        console.warn('[RETELL_DATA] No agent assigned to user');
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'No agent assigned to your account',
          agentId: null,
        }));
        return;
      }

      debugLog('[RETELL_DATA] Found agent:', agentId);

      // Fetch all data in parallel
      const [metrics, calls, timeData, agentMetrics] = await Promise.all([
        retellService.getDashboardMetrics(user.id),
        retellService.getAgentCalls(agentId, 50),
        retellService.getCallsTimeData(agentId, 30),
        retellService.getAgentMetrics(agentId, 30),
      ]);

      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          metrics,
          calls,
          timeData,
          agentMetrics,
          agentId,
          loading: false,
          error: null,
        }));

        debugLog('[RETELL_DATA] Successfully loaded data:', {
          metrics: !!metrics,
          callsCount: calls.length,
          timeDataPoints: timeData.length,
          agentMetrics: !!agentMetrics,
        });
      }
    } catch (error: any) {
      console.error('[RETELL_DATA] Error fetching data:', error);
      
      if (!isUnmountedRef.current) {
        const errorMessage = error.message || 'Failed to load call data';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        
        if (showLoading) {
          toast.error(`Data fetch failed: ${errorMessage}`);
        }
      }
    }
  }, [user?.id]);

  // Sync calls to cache
  const syncCalls = useCallback(async () => {
    if (!user?.id) {
      toast.error('No user authenticated');
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      debugLog('[RETELL_DATA] Starting call sync...');
      const syncedCount = await retellService.syncCallsToCache(user.id);
      
      debugLog('[RETELL_DATA] Synced', syncedCount, 'calls');
      toast.success(`Synced ${syncedCount} calls successfully`);
      
      // Refresh data after sync
      await fetchData(false);
    } catch (error: any) {
      console.error('[RETELL_DATA] Sync failed:', error);
      const errorMessage = error.message || 'Sync failed';
      
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      toast.error(`Sync failed: ${errorMessage}`);
    }
  }, [user?.id, fetchData]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Set up auto-refresh every 5 minutes
  useEffect(() => {
    // Initial data fetch
    fetchData(true);

    // Set up 5-minute auto-refresh
    refreshIntervalRef.current = setInterval(() => {
      if (!state.loading) {
        debugLog('[RETELL_DATA] Auto-refreshing data...');
        fetchData(false);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [fetchData, state.loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    metrics: state.metrics,
    calls: state.calls,
    timeData: state.timeData,
    agentMetrics: state.agentMetrics,
    loading: state.loading,
    error: state.error,
    agentId: state.agentId,
    refreshData,
    syncCalls,
  };
}

// Analytics hook with date range filtering
export function useRetellAnalytics(
  initialStartDate?: Date,
  initialEndDate?: Date
): RetellAnalyticsState {
  const { user } = useAuth();
  const [state, setState] = useState<{
    calls: RetellCall[];
    timeData: TimeBasedCallData[];
    metrics: AgentMetrics | null;
    loading: boolean;
    error: string | null;
  }>({
    calls: [],
    timeData: [],
    metrics: null,
    loading: false,
    error: null,
  });

  const isUnmountedRef = useRef(false);

  // Fetch analytics data with date filtering
  const fetchAnalyticsData = useCallback(async (
    startDate?: Date,
    endDate?: Date,
    showLoading = true
  ) => {
    if (!user?.id || isUnmountedRef.current) {
      debugLog('[RETELL_ANALYTICS] No user or component unmounted, skipping fetch');
      return;
    }

    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      debugLog('[RETELL_ANALYTICS] Fetching analytics data for user:', user.id);

      // Get user's primary agent
      const userAgent = await retellService.getUserAgent(user.id);
      const agentId = userAgent?.retell_agents?.retell_agent_id;

      if (!agentId) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'No agent assigned to your account',
        }));
        return;
      }

      // Calculate date range (default to last 30 days)
      const end = endDate || new Date();
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      debugLog('[RETELL_ANALYTICS] Date range:', { start, end, daysDiff });

      // Fetch analytics data
      const [calls, timeData, metrics] = await Promise.all([
        retellService.getAgentCalls(agentId, 200), // Get more calls for analytics
        retellService.getCallsTimeData(agentId, daysDiff),
        retellService.getAgentMetrics(agentId, daysDiff),
      ]);

      // Filter calls by date range
      const startTimestamp = start.getTime() / 1000;
      const endTimestamp = end.getTime() / 1000;
      
      const filteredCalls = calls.filter(call => 
        call.start_timestamp >= startTimestamp && call.start_timestamp <= endTimestamp
      );

      // Filter time data by date range
      const filteredTimeData = timeData.filter(data => {
        const dataDate = new Date(data.date);
        return dataDate >= start && dataDate <= end;
      });

      if (!isUnmountedRef.current) {
        setState(prev => ({
          ...prev,
          calls: filteredCalls,
          timeData: filteredTimeData,
          metrics,
          loading: false,
          error: null,
        }));

        debugLog('[RETELL_ANALYTICS] Successfully loaded analytics data:', {
          callsCount: filteredCalls.length,
          timeDataPoints: filteredTimeData.length,
          metrics: !!metrics,
        });
      }
    } catch (error: any) {
      console.error('[RETELL_ANALYTICS] Error fetching analytics data:', error);
      
      if (!isUnmountedRef.current) {
        const errorMessage = error.message || 'Failed to load analytics data';
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        
        if (showLoading) {
          toast.error(`Analytics fetch failed: ${errorMessage}`);
        }
      }
    }
  }, [user?.id]);

  // Refresh data function with optional date range
  const refreshData = useCallback(async (startDate?: Date, endDate?: Date) => {
    await fetchAnalyticsData(startDate, endDate, true);
  }, [fetchAnalyticsData]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData(initialStartDate, initialEndDate, true);
  }, [fetchAnalyticsData, initialStartDate, initialEndDate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  return {
    calls: state.calls,
    timeData: state.timeData,
    metrics: state.metrics,
    loading: state.loading,
    error: state.error,
    refreshData,
  };
}
