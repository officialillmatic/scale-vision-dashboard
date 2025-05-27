
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AgentsTable } from './AgentsTable';
import { RoleCheck } from '../auth/RoleCheck';
import { Agent } from '@/services/agentService';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamAgentsSectionProps {
  agents: Agent[];
  isLoading: boolean;
  isLoadingAgents: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  onOpenAgentDialog: (agent?: Agent) => void;
  onOpenAssignDialog: (agent?: Agent) => void;
  onConfirmDelete: (agent: Agent) => void;
}

export function TeamAgentsSection({
  agents,
  isLoading,
  isLoadingAgents,
  isSuperAdmin,
  isAdmin,
  onOpenAgentDialog,
  onOpenAssignDialog,
  onConfirmDelete
}: TeamAgentsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">AI Agents</h2>
        {/* Super admins always have access to create agents */}
        {isSuperAdmin || isAdmin ? (
          <Button 
            onClick={() => onOpenAgentDialog()}
            className="bg-brand-green hover:bg-brand-deep-green"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        ) : (
          <RoleCheck adminOnly>
            <Button 
              onClick={() => onOpenAgentDialog()}
              className="bg-brand-green hover:bg-brand-deep-green"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </RoleCheck>
        )}
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <AgentsTable
              agents={agents}
              isLoading={isLoadingAgents}
              onEdit={isAdmin ? onOpenAgentDialog : undefined}
              onAssign={isAdmin ? onOpenAssignDialog : undefined}
              onDelete={isAdmin ? onConfirmDelete : undefined}
              isAdmin={isAdmin}
              showRates={isAdmin}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
