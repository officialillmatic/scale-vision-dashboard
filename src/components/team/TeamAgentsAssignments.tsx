
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAgentAssignmentsTable } from './UserAgentAssignmentsTable';
import { useUserAgentAssignments } from '@/hooks/useUserAgentAssignments';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TeamAgentsAssignments() {
  const {
    assignments,
    isLoadingAssignments,
    isRemoving,
    isUpdating,
    assignmentsError,
    isError,
    refetchAssignments,
    handleRemoveAssignment,
    handleUpdatePrimary
  } = useUserAgentAssignments();

  console.log('🔍 [TeamAgentsAssignments] Component state:', {
    assignments,
    assignmentsLength: assignments?.length,
    isLoadingAssignments,
    isError,
    assignmentsError
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Assignments</CardTitle>
            <CardDescription>
              Manage which agents are assigned to which users. Toggle primary status to set a user's main agent.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              console.log('🔍 [TeamAgentsAssignments] Manual refresh triggered');
              refetchAssignments();
            }}
            disabled={isLoadingAssignments}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAssignments ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
                <p>Loading: {isLoadingAssignments.toString()}</p>
                <p>Error: {isError.toString()}</p>
                <p>Assignments: {assignments?.length || 0} items</p>
                <p>Raw assignments: {JSON.stringify(assignments, null, 2)}</p>
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
  );
}
