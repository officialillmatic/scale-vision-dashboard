import { debugLog } from "@/lib/debug";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAgentAssignmentsTable } from './UserAgentAssignmentsTable';
import { NewAssignmentDialog } from './NewAssignmentDialog';
import { useUserAgentAssignments } from '@/hooks/useUserAgentAssignments';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Plus } from 'lucide-react';

export function TeamAgentsAssignments() {
  const [isNewAssignmentDialogOpen, setIsNewAssignmentDialogOpen] = useState(false);

  const {
    assignments,
    isLoadingAssignments,
    isRemoving,
    isUpdating,
    assignmentsError,
    isError,
    refetchAssignments,
    handleRemoveAssignment,
    handleUpdatePrimary,
    handleCreateAssignment,
    availableUsers,
    availableAgents,
    isLoadingUsers,
    isLoadingAgents,
    isCreating
  } = useUserAgentAssignments();

  debugLog('🔍 [TeamAgentsAssignments] Component state:', {
    assignments,
    assignmentsLength: assignments?.length,
    isLoadingAssignments,
    isError,
    assignmentsError,
    availableUsersCount: availableUsers?.length,
    availableAgentsCount: availableAgents?.length
  });

  const handleNewAssignment = (userId: string, agentId: string, isPrimary: boolean) => {
    handleCreateAssignment(userId, agentId, isPrimary);
    setIsNewAssignmentDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agent Assignments</CardTitle>
              <CardDescription>
                Manage which agents are assigned to which users. Toggle primary status to set a user's main agent.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  debugLog('🔍 [TeamAgentsAssignments] Manual refresh triggered');
                  refetchAssignments();
                }}
                disabled={isLoadingAssignments}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAssignments ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={() => setIsNewAssignmentDialogOpen(true)}
                disabled={isLoadingUsers || isLoadingAgents}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Error State */}
          {isError && assignmentsError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Error loading assignments</p>
                  <p className="text-sm">
                    {assignmentsError instanceof Error ? assignmentsError.message : 'Unknown error occurred'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchAssignments()}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Debug Info in Development */}
          {process.env.NODE_ENV === 'development' && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertDescription>
                <div className="text-xs space-y-1">
                  <p><strong>Debug Info:</strong></p>
                  <p>Loading assignments: {isLoadingAssignments.toString()}</p>
                  <p>Error: {isError.toString()}</p>
                  <p>Assignments: {assignments?.length || 0} items</p>
                  <p>Available users: {availableUsers?.length || 0}</p>
                  <p>Available agents: {availableAgents?.length || 0}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <UserAgentAssignmentsTable
            assignments={assignments}
            isLoading={isLoadingAssignments}
            onRemove={handleRemoveAssignment}
            onUpdatePrimary={handleUpdatePrimary}
            onRefresh={refetchAssignments}
            isRemoving={isRemoving}
            isUpdating={isUpdating}
          />
        </CardContent>
      </Card>

      <NewAssignmentDialog
        isOpen={isNewAssignmentDialogOpen}
        onClose={() => setIsNewAssignmentDialogOpen(false)}
        onSubmit={handleNewAssignment}
        availableUsers={availableUsers}
        availableAgents={availableAgents}
        isLoading={isLoadingUsers || isLoadingAgents}
        isSubmitting={isCreating}
      />
    </>
  );
}
