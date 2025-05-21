
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useAgents } from '@/hooks/useAgents';
import { AgentsTable } from './AgentsTable';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

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
        
        <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            AI agents are created and assigned by platform administrators. Contact your administrator if you need a new agent or have questions about your assigned agents.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-0">
            {isLoadingAgents ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              agents.length > 0 ? (
                <AgentsTable
                  agents={agents}
                  isLoading={isLoadingAgents}
                  isAdmin={false}
                  showRates={false}
                />
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p>You don't have any agents assigned to you yet.</p>
                  <p className="mt-1 text-sm">Please contact your administrator to get access to AI agents.</p>
                </div>
              )
            )}
          </CardContent>
          {agents.length > 0 && (
            <CardFooter className="bg-muted/50 px-6 py-3 text-sm text-muted-foreground">
              These agents are assigned to you by your administrator. Contact them for any changes or issues.
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
