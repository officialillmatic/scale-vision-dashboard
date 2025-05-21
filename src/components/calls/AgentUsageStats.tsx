
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from '@/hooks/useDashboardData';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Skeleton } from "@/components/ui/skeleton";

export function AgentUsageStats() {
  const { agentUsage, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage by Agent</CardTitle>
      </CardHeader>
      <CardContent>
        {agentUsage && agentUsage.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
              <div>Agent</div>
              <div className="text-right">Calls</div>
              <div className="text-right">Minutes</div>
              <div className="text-right">Cost</div>
            </div>
            <div className="space-y-2">
              {agentUsage.map(agent => (
                <div key={agent.id} className="grid grid-cols-4 text-sm items-center">
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-right">{agent.calls}</div>
                  <div className="text-right">{Math.round(agent.minutes)}</div>
                  <div className="text-right">{formatCurrency(agent.cost)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No agent usage data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
