
import React from 'react';
import { AgentDialog } from './AgentDialog';
import { AgentAssignDialog } from './AgentAssignDialog';
import { DeleteAgentDialog } from './DeleteAgentDialog';
import { Agent, UserAgent } from '@/services/agentService';
import { CompanyMember } from '@/services/memberService';

interface TeamAgentsDialogsProps {
  isAgentDialogOpen: boolean;
  isAssignDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  selectedAgent: Agent | null;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isAssigning: boolean;
  teamMembers: CompanyMember[];
  agents: Agent[];
  onCloseAgentDialog: () => void;
  onCloseAssignDialog: () => void;
  onCloseDeleteDialog: () => void;
  onCreateAgent: (data: Partial<Agent>) => Promise<boolean>;
  onUpdateAgent: (id: string, data: Partial<Agent>) => Promise<boolean>;
  onAssignAgent: (data: Partial<UserAgent>) => Promise<boolean>;
  onDeleteConfirmed: () => Promise<void>;
}

export function TeamAgentsDialogs({
  isAgentDialogOpen,
  isAssignDialogOpen,
  isDeleteDialogOpen,
  selectedAgent,
  isCreating,
  isUpdating,
  isDeleting,
  isAssigning,
  teamMembers,
  agents,
  onCloseAgentDialog,
  onCloseAssignDialog,
  onCloseDeleteDialog,
  onCreateAgent,
  onUpdateAgent,
  onAssignAgent,
  onDeleteConfirmed
}: TeamAgentsDialogsProps) {
  return (
    <>
      {/* Agent Dialog */}
      <AgentDialog 
        isOpen={isAgentDialogOpen}
        onClose={onCloseAgentDialog}
        onSubmit={selectedAgent ? 
          (data) => onUpdateAgent(selectedAgent.id, data) : 
          onCreateAgent
        }
        isSubmitting={selectedAgent ? isUpdating : isCreating}
        agent={selectedAgent}
      />

      {/* Agent Assignment Dialog */}
      <AgentAssignDialog 
        isOpen={isAssignDialogOpen}
        onClose={onCloseAssignDialog}
        onSubmit={onAssignAgent}
        isSubmitting={isAssigning}
        teamMembers={teamMembers}
        agents={agents}
        selectedAgent={selectedAgent}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAgentDialog
        isOpen={isDeleteDialogOpen}
        onClose={onCloseDeleteDialog}
        onConfirm={onDeleteConfirmed}
        isDeleting={isDeleting}
        agent={selectedAgent}
      />
    </>
  );
}
