
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
import { Separator } from '@/components/ui/separator';

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
    console.log('🔍 [TeamAgentsContainer] Opening assignment dialog for agent:', agent?.name);
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
    console.log('🔍 [TeamAgentsContainer] Creating assignment:', { userId, agentId, isPrimary });
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
      
      {/* Company Custom Agents Section */}
      <TeamAgentsSection
        agents={agents}
        isLoading={isLoading}
        isLoadingAgents={isLoadingAgents}
        isSuperAdmin={isSuperAdmin}
        isAdmin={isAdmin}
        onOpenAgentDialog={handleOpenAgentDialog}
        onOpenAssignDialog={handleOpenAssignDialog}
        onConfirmDelete={handleConfirmDelete}
      />

      {(isSuperAdmin || isAdmin) && (
        <TeamAgentsAssignments />
      )}

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
