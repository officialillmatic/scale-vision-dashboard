
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserAgentAssignment } from '@/services/agent/userAgentAssignmentQueries';
// Import service functions to update and remove assignments
import {
  updateUserAgentAssignmentPrimary,
  removeUserAgentAssignment,
} from '@/services/agent/userAgentAssignmentQueries';
import { Users, MoreHorizontal, Trash2, Plus } from 'lucide-react';

interface AssignmentsManagementTableProps {
  assignments: UserAgentAssignment[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function AssignmentsManagementTable({ assignments, isLoading, onRefresh }: AssignmentsManagementTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleTogglePrimary = async (
    assignment: UserAgentAssignment,
    isPrimary: boolean,
  ) => {
    /*
     * Toggle the primary assignment status for a user/agent relationship.
     * When setting an assignment as primary, the service will unset other
     * primary assignments for the same user. After updating, refresh
     * the assignments list so the UI reflects the change.
     */
    try {
      await updateUserAgentAssignmentPrimary(
        assignment.id,
        isPrimary,
        assignment.user_id,
      );
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle primary status:', error);
    }
  };

  const handleRemoveAssignment = async (assignment: UserAgentAssignment) => {
    /*
     * Remove an existing user/agent assignment after confirming with the user.
     * Delegates the deletion to the service function and refreshes the
     * assignment list on success. Displays errors in the console if
     * the deletion fails.
     */
    if (window.confirm('Are you sure you want to remove this assignment?')) {
      setRemovingId(assignment.id);
      try {
        await removeUserAgentAssignment(assignment.id);
        onRefresh();
      } catch (error) {
        console.error('Failed to remove assignment:', error);
      } finally {
        setRemovingId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
        <span className="ml-2 text-muted-foreground">Loading assignments...</span>
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-muted-foreground">No agent assignments found</p>
        <p className="text-sm text-muted-foreground">Create assignments to manage user-agent relationships</p>
        <Button className="mt-4" onClick={() => console.log('Create new assignment')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage which agents are assigned to which users. Primary assignments are used as defaults for new calls.
        </p>
        <Button onClick={() => console.log('Create new assignment')}>
          <Plus className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => {
              const userDisplayName = assignment.user_details?.full_name 
                ? `${assignment.user_details.full_name}`
                : assignment.user_details?.email || `User ID: ${assignment.user_id}`;
              
              const agentDisplayName = assignment.agent_details?.name || `Agent ID: ${assignment.agent_id}`;
              
              return (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        {userDisplayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{userDisplayName}</p>
                        {assignment.user_details?.email && assignment.user_details?.full_name && (
                          <p className="text-xs text-muted-foreground">{assignment.user_details.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                        {agentDisplayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{agentDisplayName}</p>
                        {assignment.agent_details?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {assignment.agent_details.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      Custom
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={assignment.is_primary}
                        onCheckedChange={(checked) => handleTogglePrimary(assignment, checked)}
                        size="sm"
                      />
                      {assignment.is_primary && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {assignment.assigned_at ? (
                        new Date(assignment.assigned_at).toLocaleDateString()
                      ) : (
                        'Unknown'
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={removingId === assignment.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleRemoveAssignment(assignment)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Assignment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
