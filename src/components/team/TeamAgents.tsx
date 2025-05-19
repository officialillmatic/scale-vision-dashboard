
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { AgentDialog } from './AgentDialog';
import { AgentAssignDialog } from './AgentAssignDialog';
import { DeleteAgentDialog } from './DeleteAgentDialog';
import { AgentsTable } from './AgentsTable';
import { AssignmentsTable } from './AssignmentsTable';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import { Agent } from '@/services/agentService';

export function TeamAgents() {
  const { company } = useAuth();
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
  
  return (
    <div className="space-y-6">
      {/* Agents List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">AI Agents</h2>
          <Button onClick={() => handleOpenAgentDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <AgentsTable
              agents={agents}
              isLoading={isLoadingAgents}
              onEdit={handleOpenAgentDialog}
              onAssign={handleOpenAssignDialog}
              onDelete={handleConfirmDelete}
            />
          </CardContent>
        </Card>
      </div>

      {/* Agent Assignments */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Agent Assignments</h2>
        <Card>
          <CardContent className="p-0">
            <AssignmentsTable
              userAgents={userAgents}
              isLoading={isLoadingUserAgents}
              onRemove={handleRemoveAgentAssignment}
            />
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
