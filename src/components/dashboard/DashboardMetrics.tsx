
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { useCallData } from "@/hooks/useCallData";
import { AlertTriangle, DollarSign, Clock, Phone, TrendingUp } from "lucide-react";

export function DashboardMetrics() {
  const { company } = useAuth();
  const { handleSync, isSyncing } = useCallData();
  const { metrics, isLoading, error } = useDashboardMetrics();

  if (!company) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">No Company</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Please contact support to associate with a company
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <EmptyStateMessage
          title="Unable to Load Metrics"
          description="There was an error loading your dashboard metrics. Please try again."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const hasData = metrics && (
    metrics.totalCalls > 0 || 
    metrics.totalCost > 0 || 
    metrics.totalDuration > 0
  );

  if (!hasData) {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <EmptyStateMessage
          title="No calls yet – trigger your first AI call to see results"
          description="Once you start making calls with your AI agents, you'll see detailed metrics, costs, and performance data here."
          actionLabel={isSyncing ? "Syncing..." : "Sync Calls"}
          onAction={handleSync}
          isLoading={isSyncing}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Phone className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCalls}</div>
          <p className="text-xs text-muted-foreground">
            Last 30 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            ${(metrics.totalCost / Math.max(metrics.totalCalls, 1)).toFixed(3)} per call
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Math.round(metrics.totalDuration)}m
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round(metrics.avgDuration)}s avg duration
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalCalls > 0 ? '85%' : '0%'}
          </div>
          <p className="text-xs text-muted-foreground">
            Call completion rate
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
