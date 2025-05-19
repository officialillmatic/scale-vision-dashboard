
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
import { Trash2 } from 'lucide-react';
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
              <TableRow key={userAgent.id}>
                <TableCell>{userAgent.user_details?.email}</TableCell>
                <TableCell>
                  {userAgent.agent?.name || 'Unknown Agent'}
                </TableCell>
                <TableCell>
                  {userAgent.is_primary ? (
                    <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                  ) : (
                    'No'
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onRemove(userAgent.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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
