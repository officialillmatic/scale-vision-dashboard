
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { RetellAgent } from '@/services/agent/retellAgentQueries';
import { formatCurrency } from '@/lib/utils';
import { Database } from 'lucide-react';

interface SyncedAgentsTableProps {
  agents: RetellAgent[];
  isLoading: boolean;
}

export function SyncedAgentsTable({ agents, isLoading }: SyncedAgentsTableProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
        <span className="ml-2 text-muted-foreground">Loading synced agents...</span>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-12">
        <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-muted-foreground">No synced agents found</p>
        <p className="text-sm text-muted-foreground">Run the Retell AI sync to fetch agents</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Voice Model</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Last Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    {agent.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="font-medium">{agent.name || 'Unnamed Agent'}</p>
                    <p className="text-xs text-muted-foreground">ID: {agent.agent_id}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <p className="text-sm truncate">{agent.description || 'No description'}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusBadgeColor(agent.status)}>
                  {agent.status}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">
                  {formatCurrency(agent.rate_per_minute || 0.17)}/min
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{agent.voice_model || 'N/A'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{agent.language || 'en-US'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {agent.last_synced_at 
                    ? new Date(agent.last_synced_at).toLocaleString()
                    : 'Never'
                  }
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
