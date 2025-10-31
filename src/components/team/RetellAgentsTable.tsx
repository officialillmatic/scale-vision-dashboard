
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RetellAgent } from '@/services/agent/retellAgentQueries';
import { formatCurrency } from '@/lib/formatters';

interface RetellAgentsTableProps {
  agents: RetellAgent[];
  isLoading: boolean;
}

export function RetellAgentsTable({ 
  agents, 
  isLoading
}: RetellAgentsTableProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  console.log('🔍 [RetellAgentsTable] Rendering with agents:', agents);
  console.log('🔍 [RetellAgentsTable] isLoading:', isLoading);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Voice Model</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Last Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <LoadingSpinner size="md" className="mx-auto" />
              </TableCell>
            </TableRow>
          ) : agents && agents.length > 0 ? (
            agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <span>{agent.name || 'Unnamed Agent'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">
                    {agent.description || 'No description'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatCurrency(agent.rate_per_minute || 0.17)}/min
                </TableCell>
                <TableCell>{agent.voice_model || 'N/A'}</TableCell>
                <TableCell>{agent.language || 'en-US'}</TableCell>
                <TableCell>
                  {agent.last_synced_at 
                    ? new Date(agent.last_synced_at).toLocaleString()
                    : 'Never'
                  }
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-muted-foreground">No synced agents found.</p>
                  <p className="text-sm text-muted-foreground">
                    Run the Retell AI sync to fetch agents from your Retell account.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
