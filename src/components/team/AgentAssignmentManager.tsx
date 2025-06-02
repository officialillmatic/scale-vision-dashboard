
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, UserPlus } from 'lucide-react';
import { AgentsTable } from './AgentsTable';
import { AssignmentsTable } from './AssignmentsTable';
import { NewAssignmentDialog } from './NewAssignmentDialog';
import { useAgents } from '@/hooks/useAgents';
import { useUserAgentAssignments } from '@/hooks/useUserAgentAssignments';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function AgentAssignmentManager() {
  const [isNewAssignmentDialogOpen, setIsNewAssignmentDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const {
    agents,
    isLoadingAgents,
    isAdmin
  } = useAgents();

  const {
    assignments,
    isLoadingAssignments,
    handleRemoveAssignment,
    handleUpdatePrimary,
    handleCreateAssignment,
    availableUsers,
    availableAgents,
    isLoadingUsers,
    isLoadingAgents: isLoadingAvailableAgents,
    isCreating,
    refetchAssignments,
    usersError,
    handleRefreshUsers
  } = useUserAgentAssignments();

  const handleAssignAgent = (agent = null) => {
    setSelectedAgent(agent);
    setIsNewAssignmentDialogOpen(true);
  };

  const handleAssignmentSubmit = async (userId: string, agentId: string, isPrimary: boolean) => {
    await handleCreateAssignment(userId, agentId, isPrimary);
    setIsNewAssignmentDialogOpen(false);
    setSelectedAgent(null);
  };

  const handleCloseDialog = () => {
    setIsNewAssignmentDialogOpen(false);
    setSelectedAgent(null);
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Agent Assignment</h3>
            <p className="text-gray-600">
              You don't have permission to manage agent assignments.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Available Agents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Agents</CardTitle>
            <Button 
              onClick={() => handleAssignAgent()}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAgents ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <AgentsTable
              agents={agents}
              isLoading={isLoadingAgents}
              onAssign={handleAssignAgent}
              isAdmin={isAdmin}
              showRates={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      {/* Current Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Current Agent Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentsTable
            userAgents={assignments}
            isLoading={isLoadingAssignments}
            onRemove={handleRemoveAssignment}
            onRefresh={refetchAssignments}
          />
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <NewAssignmentDialog
        isOpen={isNewAssignmentDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleAssignmentSubmit}
        availableUsers={availableUsers}
        availableAgents={availableAgents}
        selectedAgent={selectedAgent}
        isLoading={isLoadingUsers || isLoadingAvailableAgents}
        isSubmitting={isCreating}
        usersError={usersError}
        onRefreshUsers={handleRefreshUsers}
      />
    </div>
  );
}
