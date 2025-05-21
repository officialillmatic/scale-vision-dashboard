
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAgents } from '@/hooks/useAgents';
import { AgentsTable } from './AgentsTable';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export function UserAgentViewer() {
  const { company } = useAuth();
  
  const {
    agents,
    isLoadingAgents,
  } = useAgents();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User View - Only Assigned Agents */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your AI Agents</h2>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {isLoadingAgents ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <AgentsTable
                agents={agents}
                isLoading={isLoadingAgents}
                isAdmin={false}
                showRates={true}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
