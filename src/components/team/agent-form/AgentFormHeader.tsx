
import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Agent } from '@/services/agentService';

interface AgentFormHeaderProps {
  agent: Agent | null;
}

export function AgentFormHeader({ agent }: AgentFormHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>{agent ? 'Edit Agent' : 'Create Agent'}</DialogTitle>
      <DialogDescription>
        {agent
          ? 'Update the agent details below.'
          : 'Enter the details for the new AI agent.'}
      </DialogDescription>
    </DialogHeader>
  );
}
