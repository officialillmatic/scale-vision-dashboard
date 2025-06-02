
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAgentSync } from "@/hooks/useAgentSync";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function DashboardSyncAlerts() {
  const { syncStats, unassignedAgents, isLoading, error } = useAgentSync();

  if (isLoading || !syncStats) {
    return null;
  }

  const latestSync = syncStats[0];
  const unassignedCount = unassignedAgents?.length || 0;
  const isCurrentlyRunning = latestSync?.sync_status === 'running';
  const hasFailed = latestSync?.sync_status === 'failed';

  return (
    <div className="space-y-4">
      {/* Show error alert if there's an error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Show sync status alerts */}
      {isCurrentlyRunning && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            Agent synchronization is currently running...
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
              In Progress
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      {hasFailed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Latest agent sync failed: {latestSync.error_message}
            {latestSync.sync_started_at && (
              <span className="ml-2 text-xs">
                ({formatDistanceToNow(new Date(latestSync.sync_started_at))} ago)
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Show unassigned agents alert */}
      {unassignedCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            You have {unassignedCount} unassigned agents that need to be configured.
            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
              Attention Required
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      {/* Show success message if everything is good */}
      {!isCurrentlyRunning && !hasFailed && !error && unassignedCount === 0 && latestSync?.sync_status === 'completed' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            All agents are synchronized and properly assigned.
            {latestSync.sync_completed_at && (
              <span className="ml-2 text-xs">
                Last sync: {formatDistanceToNow(new Date(latestSync.sync_completed_at))} ago
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
