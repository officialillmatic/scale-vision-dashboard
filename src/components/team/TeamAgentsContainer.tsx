import { debugLog } from "@/lib/debug";

import React, { useState } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useUserAgentAssignments } from '@/hooks/useUserAgentAssignments';
import { Agent } from '@/services/agentService';
import { TeamAgentsHeader } from './TeamAgentsHeader';
import { TeamAgentsSection } from './TeamAgentsSection';
import { TeamAgentsAssignments } from './TeamAgentsAssignments';
import { TeamAgentsDialogs } from './TeamAgentsDialogs';
import { UserAgentViewer } from './UserAgentViewer';
import { RetellAgentsSection } from './RetellAgentsSection';
import { NewAssignmentDialog } from './NewAssignmentDialog';
import { AgentAssignmentManager } from './AgentAssignmentManager';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { AgentsTable } from './AgentsTable';
import { Badge } from '@/components/ui/badge';

export function TeamAgentsContainer() {
  const { company } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const { isSuperAdmin } = useSuperAdmin();
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
    handleRemoveAgentAssignment,
    isAdmin,
    refetchUserAgents
  } = useAgents();

  const { teamMembers, isLoading: isLoadingMembers } = useTeamMembers(company?.id);

  const {
    availableUsers,
    availableAgents,
    isLoadingUsers,
    isLoadingAgents: isLoadingAvailableAgents,
    handleCreateAssignment,
    isCreating: isCreatingAssignment,
    usersError,
    handleRefreshUsers
  } = useUserAgentAssignments();

  const handleOpenAgentDialog = (agent?: Agent) => {
    setSelectedAgent(agent || null);
    setIsAgentDialogOpen(true);
  };

  const handleOpenAssignDialog = (agent?: Agent) => {
    debugLog('🔍 [TeamAgentsContainer] Opening assignment dialog for agent:', agent?.name);
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

  const handleCloseAssignDialog = () => {
    setSelectedAgent(null);
    setIsAssignDialogOpen(false);
  };

  const handleAssignmentSubmit = async (userId: string, agentId: string, isPrimary: boolean) => {
    debugLog('🔍 [TeamAgentsContainer] Creating assignment:', { userId, agentId, isPrimary });
    await handleCreateAssignment(userId, agentId, isPrimary);
    handleCloseAssignDialog();
  };

  const handleRefreshAssignments = () => {
    refetchUserAgents();
  };

  const isLoading = isLoadingAgents || isLoadingUserAgents || isLoadingMembers;
  
  // For non-admin users (excluding super admins), show only their assigned agents with the simplified view
  if (!isAdmin && !isSuperAdmin) {
    return <UserAgentViewer />;
  }
  
  return (
    <div className="space-y-8 animate-fade-in">
      <TeamAgentsHeader isSuperAdmin={isSuperAdmin} />
      
      {/* Synced Retell AI Agents Section */}
      <RetellAgentsSection />
      
      <Separator className="my-8" />
      
      {/* Custom AI Agents Management Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Custom AI Agents</h2>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Settings className="w-3 h-3 mr-1" />
              Company Managed
            </Badge>
          </div>
          {/* Super admins always have access to create agents */}
          {isSuperAdmin || isAdmin ? (
            <Button 
              onClick={() => handleOpenAgentDialog()}
              className="bg-brand-green hover:bg-brand-deep-green"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Agent
            </Button>
          ) : null}
        </div>
        
        <Card>
          <CardContent className="p-0">
            <AgentsTable
              agents={agents}
              isLoading={isLoadingAgents}
              onEdit={isAdmin ? handleOpenAgentDialog : undefined}
              onAssign={isAdmin ? handleOpenAssignDialog : undefined}
              onDelete={isAdmin ? handleConfirmDelete : undefined}
              isAdmin={isAdmin}
              showRates={isAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* User Agent Assignment Management */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Agent Assignment Management</h2>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            User Assignments
          </Badge>
        </div>
        <AgentAssignmentManager />
      </div>

      {/* Agent Management Dialogs */}
      {(isSuperAdmin || isAdmin) && (
        <TeamAgentsDialogs
          isAgentDialogOpen={isAgentDialogOpen}
          isAssignDialogOpen={false}
          isDeleteDialogOpen={isDeleteDialogOpen}
          selectedAgent={selectedAgent}
          isCreating={isCreating}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          isAssigning={isAssigning}
          teamMembers={teamMembers}
          agents={agents}
          onCloseAgentDialog={() => setIsAgentDialogOpen(false)}
          onCloseAssignDialog={() => {}}
          onCloseDeleteDialog={() => setIsDeleteDialogOpen(false)}
          onCreateAgent={handleCreateAgent}
          onUpdateAgent={handleUpdateAgent}
          onAssignAgent={handleAssignAgent}
          onDeleteConfirmed={handleDeleteConfirmed}
        />
      )}

      {/* New Assignment Dialog for agent-specific assignments */}
      <NewAssignmentDialog
        isOpen={isAssignDialogOpen}
        onClose={handleCloseAssignDialog}
        onSubmit={handleAssignmentSubmit}
        availableUsers={availableUsers}
        availableAgents={availableAgents}
        selectedAgent={selectedAgent}
        isLoading={isLoadingUsers || isLoadingAvailableAgents}
        isSubmitting={isCreatingAssignment}
        usersError={usersError}
        onRefreshUsers={handleRefreshUsers}
      />
    </div>
  );
}
