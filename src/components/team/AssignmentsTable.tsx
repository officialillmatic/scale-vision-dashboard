
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

interface AssignmentsTableProps {
  userAgents: UserAgentAssignment[];
  isLoading: boolean;
  onRemove: (id: string) => void;
  onRefresh?: () => void;
}

export function AssignmentsTable({ 
  userAgents, 
  isLoading, 
  onRemove,
  onRefresh
}: AssignmentsTableProps) {
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Current Assignments ({userAgents?.length || 0})</h3>
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
                  <LoadingSpinner size="md" className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : userAgents && userAgents.length > 0 ? (
              userAgents.map((assignment) => {
                const userDisplayName = assignment.user_details?.full_name 
                  ? `${assignment.user_details.full_name} (${assignment.user_details.email})`
                  : assignment.user_details?.email || `User ID: ${assignment.user_id}`;
                
                const agentDisplayName = assignment.agent_details?.name || `Agent ID: ${assignment.agent_id}`;
                
                return (
                  <TableRow key={assignment.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{userDisplayName}</p>
                        {assignment.user_details?.email && assignment.user_details?.full_name && (
                          <p className="text-sm text-muted-foreground">{assignment.user_details.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{agentDisplayName}</p>
                        {assignment.agent_details?.description && (
                          <p className="text-sm text-muted-foreground">{assignment.agent_details.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {assignment.is_primary && (
                          <Badge className="bg-brand-light-green text-brand-deep-green border-brand-green">
                            Primary
                          </Badge>
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
                        disabled={removingId === assignment.id}
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
                      Use the "Assign" button above to create assignments.
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
