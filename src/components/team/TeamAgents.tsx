
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { AgentDialog } from './AgentDialog';
import { AgentAssignDialog } from './AgentAssignDialog';
import { DeleteAgentDialog } from './DeleteAgentDialog';
import { AgentsTable } from './AgentsTable';
import { AssignmentsTable } from './AssignmentsTable';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { Agent } from '@/services/agentService';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAgentViewer } from './UserAgentViewer';
import { RoleCheck } from '../auth/RoleCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function TeamAgents() {
  const { company } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const {
    agents,
    userAgents,
    isLoadingAgents,
    isLoadingUserAgents,
    isCreating,
    isUpdating,
    isDeleting,
    isAssigning,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleAssignAgent,
    handleRemoveAgentAssignment
  } = useAgents();

  const { teamMembers, isLoading: isLoadingMembers } = useTeamMembers(company?.id);

  const handleOpenAgentDialog = (agent?: Agent) => {
    setSelectedAgent(agent || null);
    setIsAgentDialogOpen(true);
  };

  const handleOpenAssignDialog = (agent?: Agent) => {
    setSelectedAgent(agent || null);
    setIsAssignDialogOpen(true);
  };

  const handleConfirmDelete = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (selectedAgent?.id) {
      await handleDeleteAgent(selectedAgent.id);
    }
    setIsDeleteDialogOpen(false);
  };

  const isAdmin = isCompanyOwner || can.manageAgents;
  const isLoading = isLoadingAgents || isLoadingUserAgents || isLoadingMembers;
  
  // For non-admin users, show only their assigned agents with the simplified view
  if (!isAdmin) {
    return <UserAgentViewer />;
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          As an administrator, you can create and assign AI agents to users. These agents handle calls and interactions for your team.
        </AlertDescription>
      </Alert>
      
      {/* Agents List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">AI Agents</h2>
          <RoleCheck adminOnly>
            <Button 
              onClick={() => handleOpenAgentDialog()}
              className="bg-brand-green hover:bg-brand-deep-green"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </RoleCheck>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <AgentsTable
                agents={agents}
                isLoading={isLoadingAgents}
                onEdit={isAdmin ? handleOpenAgentDialog : undefined}
                onAssign={isAdmin ? handleOpenAssignDialog : undefined}
                onDelete={isAdmin ? handleConfirmDelete : undefined}
                isAdmin={isAdmin}
                showRates={isAdmin}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Assignments - Only visible to admins */}
      <RoleCheck adminOnly>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Agent Assignments</h2>
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <AssignmentsTable
                  userAgents={userAgents}
                  isLoading={isLoadingUserAgents}
                  onRemove={handleRemoveAgentAssignment}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </RoleCheck>

      {/* Dialogs */}
      <RoleCheck adminOnly>
        {/* Agent Dialog */}
        <AgentDialog 
          isOpen={isAgentDialogOpen}
          onClose={() => setIsAgentDialogOpen(false)}
          onSubmit={selectedAgent ? 
            (data) => handleUpdateAgent(selectedAgent.id, data) : 
            handleCreateAgent
          }
          isSubmitting={selectedAgent ? isUpdating : isCreating}
          agent={selectedAgent}
        />

        {/* Agent Assignment Dialog */}
        <AgentAssignDialog 
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          onSubmit={handleAssignAgent}
          isSubmitting={isAssigning}
          teamMembers={teamMembers}
          agents={agents}
          selectedAgent={selectedAgent}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteAgentDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirmed}
          isDeleting={isDeleting}
          agent={selectedAgent}
        />
      </RoleCheck>
    </div>
  );
}
