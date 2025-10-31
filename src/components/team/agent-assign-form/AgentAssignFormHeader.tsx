
import React from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function AgentAssignFormHeader() {
  return (
    <DialogHeader>
      <DialogTitle>Assign Agent to Team Member</DialogTitle>
      <DialogDescription>
        Assign an AI agent to a team member. Each member can have multiple agents,
        but only one primary agent.
      </DialogDescription>
    </DialogHeader>
  );
}
