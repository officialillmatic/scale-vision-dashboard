
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
import { Trash2, Loader } from 'lucide-react';
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

  return (
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
          ) : userAgents.length > 0 ? (
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
                No agent assignments found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
