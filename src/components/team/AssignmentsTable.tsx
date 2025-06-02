
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
import { UserAgent, updateUserAgentPrimary } from '@/services/agentService';
import { toast } from 'sonner';

interface AssignmentsTableProps {
  userAgents: UserAgent[];
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
  const [updatingPrimaryId, setUpdatingPrimaryId] = React.useState<string | null>(null);

  console.log('🔍 [AssignmentsTable] Received userAgents:', userAgents);
  console.log('🔍 [AssignmentsTable] isLoading:', isLoading);
  console.log('🔍 [AssignmentsTable] userAgents length:', userAgents?.length);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemove(id);
    } finally {
      setRemovingId(null);
    }
  };

  const handlePrimaryToggle = async (userAgent: UserAgent, isPrimary: boolean) => {
    setUpdatingPrimaryId(userAgent.id);
    try {
      await updateUserAgentPrimary(
        userAgent.id, 
        isPrimary, 
        userAgent.user_id, 
        userAgent.company_id
      );
      toast.success(isPrimary ? 'Set as primary agent' : 'Removed primary status');
      onRefresh?.();
    } catch (error: any) {
      toast.error(`Failed to update primary status: ${error.message}`);
    } finally {
      setUpdatingPrimaryId(null);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      console.log('🔍 [AssignmentsTable] Manual refresh triggered');
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Current Assignments</h3>
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <LoadingSpinner size="md" className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : userAgents && userAgents.length > 0 ? (
              userAgents.map((userAgent) => (
                <TableRow key={userAgent.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{userAgent.user_details?.name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{userAgent.user_details?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {userAgent.agent?.name || 'Unknown Agent'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={userAgent.is_primary}
                        onCheckedChange={(checked) => handlePrimaryToggle(userAgent, checked)}
                        disabled={updatingPrimaryId === userAgent.id}
                      />
                      {userAgent.is_primary && (
                        <Badge className="bg-brand-light-green text-brand-deep-green border-brand-green">
                          Primary
                        </Badge>
                      )}
                      {updatingPrimaryId === userAgent.id && (
                        <Loader className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemove(userAgent.id)}
                      disabled={removingId === userAgent.id}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      {removingId === userAgent.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-muted-foreground">No agent assignments found.</p>
                    <p className="text-sm text-muted-foreground">
                      Use the "Assign Agent" button above to create assignments.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Debug: {userAgents?.length || 0} assignments loaded, isLoading: {isLoading.toString()}
        </div>
      )}
    </div>
  );
}
