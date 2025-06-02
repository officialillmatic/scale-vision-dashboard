
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAgentSync } from "@/hooks/useAgentSync";
import { RefreshCw, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function DashboardSyncHeader() {
  const {
    syncStats,
    unassignedAgents,
    isLoading,
    error,
    syncNow,
    refreshStats
  } = useAgentSync();

  const latestSync = syncStats?.[0];
  const isCurrentlyRunning = latestSync?.sync_status === 'running';
  const unassignedCount = unassignedAgents?.length || 0;

  const getSyncStatusBadge = () => {
    if (isCurrentlyRunning) {
      return (
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      );
    }
    
    if (latestSync?.sync_status === 'completed') {
      return (
        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
          <Bot className="h-3 w-3 mr-1" />
          {latestSync.agents_created + latestSync.agents_updated} agents synced
        </Badge>
      );
    }
    
    if (latestSync?.sync_status === 'failed') {
      return (
        <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
          Failed
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {getSyncStatusBadge()}
            {unassignedCount > 0 && (
              <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                {unassignedCount} unassigned
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-gray-600">Monitor your AI call performance and insights.</p>
            {latestSync?.sync_completed_at && (
              <span className="text-sm text-gray-500">
                Last sync: {formatDistanceToNow(new Date(latestSync.sync_completed_at))} ago
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isLoading}
            className="bg-white hover:bg-gray-50"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          
          <Button
            onClick={syncNow}
            disabled={isLoading || isCurrentlyRunning}
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading || isCurrentlyRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync Agents
              </>
            )}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="text-red-600 font-medium">Sync Error</div>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
