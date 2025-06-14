
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Agent,
  updateAgent,
  deleteAgent,
  assignAgentToUser
} from '@/services/agentService';
import { formatCurrency } from '@/lib/utils';
import { Bot, Edit, Trash2, MoreHorizontal, UserPlus } from 'lucide-react';

interface CustomAgentsTableProps {
  agents: Agent[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function CustomAgentsTable({ agents, isLoading, onRefresh }: CustomAgentsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default:
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    }
  };

  const handleEdit = async (agent: Agent) => {
    const name = window.prompt('Agent name', agent.name);
    if (!name) return;
    const description = window.prompt('Description', agent.description || '') || '';
    try {
      await updateAgent(agent.id, { name, description });
      onRefresh();
    } catch (error) {
      console.error('Failed to update agent:', error);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      setDeletingId(agent.id);
      try {
        await deleteAgent(agent.id);
        onRefresh();
      } catch (error) {
        console.error('Failed to delete agent:', error);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleAssign = async (agent: Agent) => {
    const userId = window.prompt('Enter user ID to assign this agent to');
    if (!userId) return;
    try {
      await assignAgentToUser({
        user_id: userId,
        agent_id: agent.id,
        company_id: agent.company_id,
        is_primary: false
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to assign agent:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
        <span className="ml-2 text-muted-foreground">Loading custom agents...</span>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-12">
        <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-muted-foreground">No custom agents found</p>
        <p className="text-sm text-muted-foreground">Create your first custom agent to get started</p>
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
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {agent.avatar_url ? (
                    <img 
                      src={agent.avatar_url} 
                      alt={agent.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">Custom Agent</p>
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
                  {formatCurrency(agent.rate_per_minute || 0.02)}/min
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={deletingId === agent.id}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(agent)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAssign(agent)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(agent)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
