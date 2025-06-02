
import React, { useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentSync } from "@/hooks/useAgentSync";
import { AlertTriangle, Bot, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function DashboardSyncAlerts() {
  const {
    syncStats,
    unassignedAgents,
    isLoading,
    syncNow
  } = useAgentSync();

  const latestSync = syncStats?.[0];
  const unassignedCount = unassignedAgents?.length || 0;

  // Show toast notifications for sync results
  useEffect(() => {
    if (latestSync?.sync_status === 'completed' && latestSync.agents_created > 0) {
      toast.success(`Sync completed: ${latestSync.agents_created} new agents added`);
    }
    if (latestSync?.sync_status === 'failed') {
      toast.error(`Sync failed: ${latestSync.error_message}`);
    }
  }, [latestSync]);

  // Show warning for unassigned agents
  if (unassignedCount > 0) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">Unassigned Agents Detected</AlertTitle>
        <AlertDescription className="text-orange-700">
          <div className="flex items-center justify-between mt-2">
            <div>
              <p>{unassignedCount} agents are not assigned to any users and won't be available for calls.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {unassignedAgents?.slice(0, 3).map((agent) => (
                  <Badge 
                    key={agent.id} 
                    variant="outline"
                    className="border-orange-300 text-orange-700 bg-orange-100"
                  >
                    <Bot className="h-3 w-3 mr-1" />
                    {agent.name}
                  </Badge>
                ))}
                {unassignedCount > 3 && (
                  <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100">
                    +{unassignedCount - 3} more
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncNow}
              disabled={isLoading}
              className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Sync Now"
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show success message if sync completed recently
  if (latestSync?.sync_status === 'completed' && latestSync.sync_completed_at) {
    const syncTime = new Date(latestSync.sync_completed_at);
    const now = new Date();
    const timeDiff = now.getTime() - syncTime.getTime();
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));

    // Only show if sync was within last 5 minutes
    if (minutesAgo < 5) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <Bot className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Sync Completed Successfully</AlertTitle>
          <AlertDescription className="text-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p>Agent synchronization completed {minutesAgo === 0 ? 'just now' : `${minutesAgo} minutes ago`}</p>
                <div className="flex gap-2 mt-2">
                  {latestSync.agents_created > 0 && (
                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100">
                      {latestSync.agents_created} created
                    </Badge>
                  )}
                  {latestSync.agents_updated > 0 && (
                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100">
                      {latestSync.agents_updated} updated
                    </Badge>
                  )}
                  {latestSync.agents_deactivated > 0 && (
                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-100">
                      {latestSync.agents_deactivated} deactivated
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
  }

  return null;
}
