
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
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Agent } from '@/services/agentService';

interface AgentsTableProps {
  agents: Agent[];
  isLoading: boolean;
  onEdit: (agent: Agent) => void;
  onAssign: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function AgentsTable({ 
  agents, 
  isLoading, 
  onEdit, 
  onAssign, 
  onDelete 
}: AgentsTableProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
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
          ) : agents.length > 0 ? (
            agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    {agent.avatar_url ? (
                      <img 
                        src={agent.avatar_url} 
                        alt={agent.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{agent.name}</span>
                  </div>
                </TableCell>
                <TableCell>{agent.description || 'No description'}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(agent.status)}>
                    {agent.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => onEdit(agent)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => onAssign(agent)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => onDelete(agent)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No agents found. Create one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
