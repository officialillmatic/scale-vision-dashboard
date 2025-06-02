
import React, { useState } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Agent } from '@/services/agentService';
import { TeamAgentsHeader } from './TeamAgentsHeader';
import { TeamAgentsSection } from './TeamAgentsSection';
import { TeamAgentsAssignments } from './TeamAgentsAssignments';
import { TeamAgentsDialogs } from './TeamAgentsDialogs';
import { UserAgentViewer } from './UserAgentViewer';

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

  const handleRefreshAssignments = () => {
    refetchUserAgents();
  };

  const isLoading = isLoadingAgents || isLoadingUserAgents || isLoadingMembers;
  
  // For non-admin users (excluding super admins), show only their assigned agents with the simplified view
  if (!isAdmin && !isSuperAdmin) {
    return <UserAgentViewer />;
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <TeamAgentsHeader isSuperAdmin={isSuperAdmin} />
      
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
        <TeamAgentsAssignments
          userAgents={userAgents}
          isLoading={isLoading}
          isLoadingUserAgents={isLoadingUserAgents}
          onRemove={handleRemoveAgentAssignment}
          onRefresh={handleRefreshAssignments}
        />
      )}

      {(isSuperAdmin || isAdmin) && (
        <TeamAgentsDialogs
          isAgentDialogOpen={isAgentDialogOpen}
          isAssignDialogOpen={isAssignDialogOpen}
          isDeleteDialogOpen={isDeleteDialogOpen}
          selectedAgent={selectedAgent}
          isCreating={isCreating}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          isAssigning={isAssigning}
          teamMembers={teamMembers}
          agents={agents}
          onCloseAgentDialog={() => setIsAgentDialogOpen(false)}
          onCloseAssignDialog={() => setIsAssignDialogOpen(false)}
          onCloseDeleteDialog={() => setIsDeleteDialogOpen(false)}
          onCreateAgent={handleCreateAgent}
          onUpdateAgent={handleUpdateAgent}
          onAssignAgent={handleAssignAgent}
          onDeleteConfirmed={handleDeleteConfirmed}
        />
      )}
    </div>
  );
}
