import { debugLog } from "@/lib/debug";

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
import { Trash2, Loader, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserAgentAssignment } from '@/services/agent/userAgentAssignmentQueries';

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

  debugLog('🔍 [UserAgentAssignmentsTable] Rendering with', assignments?.length || 0, 'assignments');

  const handleRemove = async (assignmentId: string) => {
    debugLog('🔍 [UserAgentAssignmentsTable] Removing assignment:', assignmentId);
    setRemovingId(assignmentId);
    try {
      await onRemove(assignmentId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      debugLog('🔍 [UserAgentAssignmentsTable] Manual refresh triggered');
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">User Agent Assignments ({assignments?.length || 0})</h3>
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
                // Format user display name using the joined data
                const userDisplayName = assignment.user_details?.full_name 
                  ? `${assignment.user_details.full_name} (${assignment.user_details.email})`
                  : assignment.user_details?.email || `User ID: ${assignment.user_id}`;
                
                // Format agent display name using the joined data
                const agentDisplayName = assignment.agent_details?.name || `Agent ID: ${assignment.agent_id}`;
                
                return (
                  <TableRow key={assignment.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{userDisplayName}</p>
                        {assignment.user_details?.full_name && assignment.user_details?.email && (
                          <p className="text-sm text-muted-foreground">{assignment.user_details.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{agentDisplayName}</p>
                        {assignment.agent_details?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.agent_details.description}
                          </p>
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
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Primary
                          </Badge>
                        )}
                        {isUpdating && (
                          <Loader className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.assigned_at ? (
                        new Date(assignment.assigned_at).toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
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
                      Create new assignments using the "New Assignment" button above.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
