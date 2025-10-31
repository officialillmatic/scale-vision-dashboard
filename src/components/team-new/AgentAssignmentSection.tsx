
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Database, Bot, Users, RefreshCw, RotateCcw, Plus } from 'lucide-react';
import { SyncedAgentsTable } from './SyncedAgentsTable';
import { CustomAgentsTable } from './CustomAgentsTable';
import { AssignmentsManagementTable } from './AssignmentsManagementTable';
import { CreateAgentModal } from './CreateAgentModal';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useRetellAgentsData } from '@/hooks/useRetellAgentsData';
import { useRetellAgentSync } from '@/hooks/useRetellAgentSync';
import { useAgents } from '@/hooks/useAgents';
import { useUserAgentAssignments } from '@/hooks/useUserAgentAssignments';

export function AgentAssignmentSection() {
  const { isSuperAdmin } = useSuperAdmin();
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false);
  
  const {
    retellAgents,
    isLoadingRetellAgents,
    refetchRetellAgents
  } = useRetellAgentsData();

  const {
    triggerSync,
    isSyncing
  } = useRetellAgentSync();

  const {
    agents: customAgents,
    isLoadingAgents,
    refetchAgents
  } = useAgents();

  const {
    assignments,
    isLoadingAssignments,
    refetchAssignments
  } = useUserAgentAssignments();

  const handleSyncAgents = () => {
    triggerSync();
    // Auto-refresh after sync
    setTimeout(() => {
      refetchRetellAgents();
    }, 2000);
  };

  const handleRefreshAll = () => {
    refetchRetellAgents();
    refetchAgents();
    refetchAssignments();
  };

  return (
    <div className="space-y-8">
      {/* Super Admin Alert */}
      {isSuperAdmin && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Super Admin Mode:</strong> You have full access to manage all agents and assignments across all companies.
          </AlertDescription>
        </Alert>
      )}

      {/* Global Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agent Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshAll} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh All
          </Button>
          <Button onClick={handleSyncAgents} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700">
            <RotateCcw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Retell AI'}
          </Button>
        </div>
      </div>

      {/* Agent Management Tabs */}
      <Tabs defaultValue="synced" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="synced" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Synced AI Agents
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Custom AI Agents
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="synced" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Synced AI Agents from Retell</CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Database className="w-3 h-3 mr-1" />
                    {retellAgents?.length || 0} synced
                  </Badge>
                </div>
                <Button variant="outline" onClick={() => refetchRetellAgents()} disabled={isLoadingRetellAgents}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingRetellAgents ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SyncedAgentsTable 
                agents={retellAgents || []} 
                isLoading={isLoadingRetellAgents} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Custom AI Agents</CardTitle>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Bot className="w-3 h-3 mr-1" />
                    {customAgents?.length || 0} custom
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => refetchAgents()} disabled={isLoadingAgents}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingAgents ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => setIsCreateAgentModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Agent
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CustomAgentsTable 
                agents={customAgents || []} 
                isLoading={isLoadingAgents}
                onRefresh={refetchAgents}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Agent Assignment Management</CardTitle>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Users className="w-3 h-3 mr-1" />
                    {assignments?.length || 0} assignments
                  </Badge>
                </div>
                <Button variant="outline" onClick={() => refetchAssignments()} disabled={isLoadingAssignments}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingAssignments ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AssignmentsManagementTable 
                assignments={assignments || []} 
                isLoading={isLoadingAssignments}
                onRefresh={refetchAssignments}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Agent Modal */}
      <CreateAgentModal
        isOpen={isCreateAgentModalOpen}
        onClose={() => setIsCreateAgentModalOpen(false)}
        onSuccess={() => {
          setIsCreateAgentModalOpen(false);
          refetchAgents();
        }}
      />
    </div>
  );
}
