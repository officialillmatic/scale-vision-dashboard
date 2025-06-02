
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Loader, RefreshCw, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserAgentAssignment } from '@/services/agent/userAgentAssignmentQueries';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserAgentAssignmentsTableProps {
  assignments: UserAgentAssignment[];
  isLoading: boolean;
  onRemove: (assignmentId: string) => void;
  onUpdatePrimary: (assignmentId: string, isPrimary: boolean, userId: string) => void;
  onRefresh?: () => void;
  isRemoving?: boolean;
  isUpdating?: boolean;
}

export function UserAgentAssignmentsTable({ 
  assignments, 
  isLoading, 
  onRemove,
  onUpdatePrimary,
  onRefresh,
  isRemoving = false,
  isUpdating = false
}: UserAgentAssignmentsTableProps) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  console.log('🔍 [UserAgentAssignmentsTable] Received props:', {
    assignments,
    assignmentsLength: assignments?.length,
    isLoading,
    assignmentsType: typeof assignments,
    assignmentsIsArray: Array.isArray(assignments)
  });

  const handleRemove = async (assignmentId: string) => {
    console.log('🔍 [UserAgentAssignmentsTable] Removing assignment:', assignmentId);
    setRemovingId(assignmentId);
    try {
      await onRemove(assignmentId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      console.log('🔍 [UserAgentAssignmentsTable] Manual refresh triggered');
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">User Agent Assignments</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Show data status */}
      {!isLoading && (
        <Alert className="bg-gray-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="text-sm">
              <p><strong>Data Status:</strong></p>
              <p>Assignments found: {assignments?.length || 0}</p>
              <p>Is loading: {isLoading.toString()}</p>
              <p>Assignments type: {typeof assignments}</p>
              <p>Is array: {Array.isArray(assignments).toString()}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <LoadingSpinner size="md" className="mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading assignments...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : assignments && Array.isArray(assignments) && assignments.length > 0 ? (
              assignments.map((assignment) => {
                console.log('🔍 [UserAgentAssignmentsTable] Rendering assignment:', assignment);
                return (
                  <TableRow key={assignment.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {assignment.user_details?.name || assignment.user_details?.email || 'Unknown User'}
                        </p>
                        {assignment.user_details?.name && (
                          <p className="text-sm text-muted-foreground">{assignment.user_details.email}</p>
                        )}
                        {/* Debug info */}
                        {process.env.NODE_ENV === 'development' && (
                          <p className="text-xs text-gray-400">ID: {assignment.user_id}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {assignment.agent_details?.name || 'Unknown Agent'}
                        </p>
                        {assignment.agent_details?.description && (
                          <p className="text-sm text-muted-foreground">{assignment.agent_details.description}</p>
                        )}
                        {/* Debug info */}
                        {process.env.NODE_ENV === 'development' && (
                          <p className="text-xs text-gray-400">ID: {assignment.agent_id}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={assignment.is_primary}
                          onCheckedChange={(checked) => onUpdatePrimary(assignment.id, checked, assignment.user_id)}
                          disabled={isUpdating}
                        />
                        {assignment.is_primary && (
                          <Badge className="bg-brand-light-green text-brand-deep-green border-brand-green">
                            Primary
                          </Badge>
                        )}
                        {isUpdating && (
                          <Loader className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemove(assignment.id)}
                        disabled={removingId === assignment.id || isRemoving}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        {removingId === assignment.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-muted-foreground">No agent assignments found.</p>
                    <p className="text-sm text-muted-foreground">
                      Assign agents to users to see them here.
                    </p>
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-400 mt-2 space-y-1">
                        <p>Debug: assignments = {JSON.stringify(assignments)}</p>
                        <p>Is array: {Array.isArray(assignments).toString()}</p>
                        <p>Length: {assignments?.length || 'undefined'}</p>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
          <p><strong>Debug Info:</strong></p>
          <p>Assignments count: {assignments?.length || 0}</p>
          <p>Is loading: {isLoading.toString()}</p>
          <p>Is removing: {isRemoving.toString()}</p>
          <p>Is updating: {isUpdating.toString()}</p>
        </div>
      )}
    </div>
  );
}
