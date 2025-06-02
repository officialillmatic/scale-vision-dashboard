
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRetellAgentSync } from '@/hooks/useRetellAgentSync';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Plus, 
  Minus,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RetellAgentSync() {
  const {
    syncStats,
    unassignedAgents,
    latestSync,
    isLoadingSyncStats,
    isLoadingUnassigned,
    isSyncing,
    triggerSync,
    isCurrentlyRunning
  } = useRetellAgentSync();

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Retell Agent Synchronization
              </CardTitle>
              <CardDescription>
                Sync agents from Retell AI API to your database
              </CardDescription>
            </div>
            <Button 
              onClick={triggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {latestSync && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getSyncStatusIcon(latestSync.sync_status)}
                  <Badge className={getSyncStatusColor(latestSync.sync_status)}>
                    {latestSync.sync_status.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {latestSync.sync_completed_at 
                    ? `Completed ${formatDistanceToNow(new Date(latestSync.sync_completed_at))} ago`
                    : `Started ${formatDistanceToNow(new Date(latestSync.sync_started_at))} ago`
                  }
                </span>
              </div>

              {latestSync.sync_status === 'completed' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {latestSync.total_agents_fetched}
                    </div>
                    <div className="text-xs text-blue-600">Fetched</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                      <Plus className="h-4 w-4" />
                      {latestSync.agents_created}
                    </div>
                    <div className="text-xs text-green-600">Created</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {latestSync.agents_updated}
                    </div>
                    <div className="text-xs text-orange-600">Updated</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                      <Minus className="h-4 w-4" />
                      {latestSync.agents_deactivated}
                    </div>
                    <div className="text-xs text-red-600">Deactivated</div>
                  </div>
                </div>
              )}

              {latestSync.error_message && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Error:</strong> {latestSync.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Unassigned Agents
            {!isLoadingUnassigned && unassignedAgents && (
              <Badge variant="secondary">
                {unassignedAgents.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Retell agents that haven't been assigned to any users yet
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoadingUnassigned ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : unassignedAgents && unassignedAgents.length > 0 ? (
            <div className="space-y-3">
              {unassignedAgents.map((agent) => (
                <div 
                  key={agent.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{agent.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ID: {agent.retell_agent_id}
                    </p>
                    {agent.language && (
                      <Badge variant="outline" className="mt-1">
                        {agent.language}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={agent.is_active ? "default" : "secondary"}
                    >
                      {agent.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Synced {formatDistanceToNow(new Date(agent.last_synced_at))} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All agents are currently assigned to users</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>
            Last 10 synchronization attempts
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoadingSyncStats ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : syncStats && syncStats.length > 0 ? (
            <div className="space-y-3">
              {syncStats.map((sync, index) => (
                <div key={sync.id}>
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {getSyncStatusIcon(sync.sync_status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSyncStatusColor(sync.sync_status)}>
                            {sync.sync_status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(sync.sync_started_at))} ago
                          </span>
                        </div>
                        {sync.sync_status === 'completed' && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {sync.agents_created}C / {sync.agents_updated}U / {sync.agents_deactivated}D
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {sync.total_agents_fetched} agents
                      </div>
                      {sync.sync_completed_at && (
                        <div className="text-xs text-muted-foreground">
                          Duration: {Math.round(
                            (new Date(sync.sync_completed_at).getTime() - 
                             new Date(sync.sync_started_at).getTime()) / 1000
                          )}s
                        </div>
                      )}
                    </div>
                  </div>
                  {index < syncStats.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sync history available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
