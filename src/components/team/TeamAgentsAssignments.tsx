
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AssignmentsTable } from './AssignmentsTable';
import { UserAgent } from '@/services/agentService';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamAgentsAssignmentsProps {
  userAgents: UserAgent[];
  isLoading: boolean;
  isLoadingUserAgents: boolean;
  onRemove: (id: string) => void;
}

export function TeamAgentsAssignments({
  userAgents,
  isLoading,
  isLoadingUserAgents,
  onRemove
}: TeamAgentsAssignmentsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Agent Assignments</h2>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <AssignmentsTable
              userAgents={userAgents}
              isLoading={isLoadingUserAgents}
              onRemove={onRemove}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
