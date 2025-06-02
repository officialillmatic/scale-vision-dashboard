
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAgentAssignmentsTable } from './UserAgentAssignmentsTable';
import { useUserAgentAssignments } from '@/hooks/useUserAgentAssignments';

export function TeamAgentsAssignments() {
  const {
    assignments,
    isLoadingAssignments,
    isRemoving,
    isUpdating,
    assignmentsError,
    refetchAssignments,
    handleRemoveAssignment,
    handleUpdatePrimary
  } = useUserAgentAssignments();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Assignments</CardTitle>
        <CardDescription>
          Manage which agents are assigned to which users. Toggle primary status to set a user's main agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assignmentsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 font-medium">Error loading assignments</p>
            <p className="text-red-600 text-sm mt-1">
              {assignmentsError instanceof Error ? assignmentsError.message : 'Unknown error occurred'}
            </p>
          </div>
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
  );
}
