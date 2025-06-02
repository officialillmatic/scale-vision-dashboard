
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentsTable } from './AssignmentsTable';
import { UserAgent } from '@/services/agentService';

interface TeamAgentsAssignmentsProps {
  userAgents: UserAgent[];
  isLoading: boolean;
  isLoadingUserAgents: boolean;
  onRemove: (id: string) => void;
  onRefresh?: () => void;
}

export function TeamAgentsAssignments({
  userAgents,
  isLoading,
  isLoadingUserAgents,
  onRemove,
  onRefresh
}: TeamAgentsAssignmentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Assignments</CardTitle>
        <CardDescription>
          Manage which agents are assigned to which team members. Toggle primary status to set a user's main agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AssignmentsTable
          userAgents={userAgents}
          isLoading={isLoading || isLoadingUserAgents}
          onRemove={onRemove}
          onRefresh={onRefresh}
        />
      </CardContent>
    </Card>
  );
}
