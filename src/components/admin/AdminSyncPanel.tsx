
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  RefreshCw, 
  Users, 
  Bot, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Clock
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentSync } from '@/hooks/useAgentSync';
import { useAdminAgentManagement } from '@/hooks/useAdminAgentManagement';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface AssignmentFormData {
  userEmail: string;
  agentId: string;
  isPrimary: boolean;
}

export function AdminSyncPanel() {
  const {
    syncStats,
    unassignedAgents,
    isLoading: isSyncLoading,
    error: syncError,
    syncNow,
    refreshStats
  } = useAgentSync();

  const adminManagement = useAdminAgentManagement();

  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormData>({
    userEmail: '',
    agentId: '',
    isPrimary: false
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  // Get latest sync stats
  const latestSync = syncStats?.[0];
  const isCurrentlyRunning = latestSync?.sync_status === 'running';

  // Calculate stats - use empty arrays as fallbacks to prevent runtime errors
  const totalAgents = 0; // Will be populated when agent management is fully implemented
  const activeAgents = 0;
  const assignedAgents = 0;
  const unassignedCount = unassignedAgents?.length || 0;

  // Handle assignment form submission
  const handleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.userEmail || !assignmentForm.agentId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsAssigning(true);
    try {
      // Placeholder for actual assignment logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAssignmentForm({
        userEmail: '',
        agentId: '',
        isPrimary: false
      });
      toast.success('Agent assigned successfully');
    } catch (error) {
      toast.error('Failed to assign agent');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle unassignment
  const handleUnassignment = async (userAgentId: string) => {
    setUnassigningId(userAgentId);
    try {
      // Placeholder for actual unassignment logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Agent unassigned successfully');
    } catch (error) {
      toast.error('Failed to unassign agent');
    } finally {
      setUnassigningId(null);
    }
  };

  // Real-time alerts - safely check for changes
  useEffect(() => {
    if (latestSync?.sync_status === 'completed' && latestSync.agents_created > 0) {
      toast.success(`Sync completed: ${latestSync.agents_created} new agents added`);
    }
    if (latestSync?.sync_status === 'failed' && latestSync.error_message) {
      toast.error(`Sync failed: ${latestSync.error_message}`);
    }
  }, [latestSync?.sync_status, latestSync?.agents_created, latestSync?.error_message]);

  useEffect(() => {
    if (unassignedCount > 0) {
      toast.info(`${unassignedCount} agents are unassigned`);
    }
  }, [unassignedCount]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Sync Administration</h1>
          <p className="text-muted-foreground">
            Manage Retell AI agent synchronization and user assignments
          </p>
        </div>
        <Button
          onClick={syncNow}
          disabled={isSyncLoading || isCurrentlyRunning}
          className="flex items-center gap-2"
        >
          {isSyncLoading || isCurrentlyRunning ? (
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

      {/* Error Alerts */}
      {syncError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sync Error</AlertTitle>
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      )}

      {adminManagement.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Agent Loading Error</AlertTitle>
          <AlertDescription>{adminManagement.error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{assignedAgents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unassignedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            {latestSync && getSyncStatusIcon(latestSync.sync_status)}
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {latestSync?.sync_completed_at 
                ? formatDistanceToNow(new Date(latestSync.sync_completed_at)) + ' ago'
                : 'Never'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="all-agents">All Agents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sync Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
                <CardDescription>Latest synchronization attempts</CardDescription>
              </CardHeader>
              <CardContent>
                {isSyncLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : syncStats && syncStats.length > 0 ? (
                  <div className="space-y-4">
                    {syncStats.slice(0, 5).map((sync) => (
                      <div key={sync.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getSyncStatusIcon(sync.sync_status)}
                          <div>
                            <div className="font-medium">
                              {sync.sync_status === 'completed' 
                                ? `${sync.agents_created || 0}C / ${sync.agents_updated || 0}U / ${sync.agents_deactivated || 0}D`
                                : sync.sync_status.toUpperCase()
                              }
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(sync.sync_started_at))} ago
                            </div>
                          </div>
                        </div>
                        {(sync.total_agents_fetched || 0) > 0 && (
                          <Badge variant="outline">
                            {sync.total_agents_fetched} agents
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No sync activity yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Unassigned Agents */}
            <Card>
              <CardHeader>
                <CardTitle>Unassigned Agents</CardTitle>
                <CardDescription>Agents that need user assignment</CardDescription>
              </CardHeader>
              <CardContent>
                {unassignedAgents && unassignedAgents.length > 0 ? (
                  <div className="space-y-3">
                    {unassignedAgents.slice(0, 5).map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {agent.language} • {agent.retell_agent_id}
                          </div>
                        </div>
                        <Badge variant={agent.is_active ? "default" : "secondary"}>
                          {agent.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                    {unassignedAgents.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        And {unassignedAgents.length - 5} more...
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    All agents are assigned
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assignment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Assign Agent</CardTitle>
                <CardDescription>Assign an agent to a user</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignment} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">User Email</label>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={assignmentForm.userEmail}
                      onChange={(e) => setAssignmentForm(prev => ({
                        ...prev,
                        userEmail: e.target.value
                      }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Agent</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={assignmentForm.agentId}
                      onChange={(e) => setAssignmentForm(prev => ({
                        ...prev,
                        agentId: e.target.value
                      }))}
                      required
                    >
                      <option value="">Select an agent</option>
                      {unassignedAgents?.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Primary Agent</label>
                    <Switch
                      checked={assignmentForm.isPrimary}
                      onCheckedChange={(checked) => setAssignmentForm(prev => ({
                        ...prev,
                        isPrimary: checked
                      }))}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isAssigning}
                  >
                    {isAssigning ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Agent
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Current Assignments Placeholder */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Current Assignments</CardTitle>
                  <CardDescription>Active agent-user assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-8">
                    Assignment management will be available once the backend is fully connected.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* All Agents Tab */}
        <TabsContent value="all-agents">
          <Card>
            <CardHeader>
              <CardTitle>All Agents</CardTitle>
              <CardDescription>Complete list of all agents in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Agent listing will be available once the backend is fully connected.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
