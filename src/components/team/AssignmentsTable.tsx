
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
import { Trash2, Loader } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { UserAgent } from '@/services/agentService';

interface AssignmentsTableProps {
  userAgents: UserAgent[];
  isLoading: boolean;
  onRemove: (id: string) => void;
}

export function AssignmentsTable({ 
  userAgents, 
  isLoading, 
  onRemove 
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
                <TableCell>{userAgent.user_details?.email || 'Unknown user'}</TableCell>
                <TableCell>
                  {userAgent.agent?.name || 'Unknown Agent'}
                </TableCell>
                <TableCell>
                  {userAgent.is_primary ? (
                    <Badge className="bg-brand-light-green text-brand-deep-green border-brand-green">
                      Primary
                    </Badge>
                  ) : (
                    'No'
                  )}
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
