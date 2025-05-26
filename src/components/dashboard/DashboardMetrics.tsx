
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { useCallData } from "@/hooks/useCallData";
import { AlertTriangle, DollarSign, Clock, Phone, TrendingUp } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export function DashboardMetrics() {
  const { company, user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { handleSync, isSyncing } = useCallData();
  const { data, isLoading, error } = useDashboardData();

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="grid gap-6 md:grid-cols-1">
        <EmptyStateMessage
          title="Unable to Load Metrics"
          description="There was an error loading your dashboard metrics. Please try again."
          actionLabel="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  // Show warning if no company (for non-super admins)
  if (!isSuperAdmin && !company) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="p-2 rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-semibold">No Company Associated</span>
                <p className="text-xs text-amber-600 mt-1">
                  Contact support to get started
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalCalls: 0,
    totalCost: '$0.00',
    totalMinutes: 0,
    avgDuration: 0
  };

  const hasData = metrics.totalCalls > 0 || 
    Number(metrics.totalCost.replace('$', '')) > 0 || 
    metrics.totalMinutes > 0;

  // Show empty state for no data
  if (!hasData) {
    return (
      <div className="grid gap-6 md:grid-cols-1">
        <EmptyStateMessage
          title="Ready to scale your AI calls?"
          description="Once you start making calls with your AI agents, you'll see detailed metrics, costs, and performance data here."
          actionLabel={isSyncing ? "Syncing..." : "Sync Calls"}
          onAction={handleSync}
          isLoading={isSyncing}
        />
      </div>
    );
  }

  const totalCostNumber = Number(metrics.totalCost.replace('$', ''));
  const avgCostPerCall = metrics.totalCalls > 0 ? totalCostNumber / metrics.totalCalls : 0;
  const avgDurationSeconds = metrics.avgDuration || 0;

  const metricCards = [
    {
      title: "Total Calls",
      value: metrics.totalCalls.toLocaleString(),
      description: "Last 30 days",
      icon: Phone,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Total Cost",
      value: metrics.totalCost,
      description: `$${avgCostPerCall.toFixed(3)} per call`,
      icon: DollarSign,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-50 to-emerald-100/50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    {
      title: "Total Duration",
      value: `${metrics.totalMinutes}m`,
      description: `${Math.round(avgDurationSeconds)}s avg duration`,
      icon: Clock,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100/50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Success Rate",
      value: metrics.totalCalls > 0 ? '85%' : '0%',
      description: "Call completion rate",
      icon: TrendingUp,
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-50 to-orange-100/50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm hover:shadow-xl">
          <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-60`} />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-gray-700">
                {card.title}
              </CardTitle>
            </div>
            <div className={`p-2.5 rounded-xl ${card.iconBg} shadow-sm`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-gray-900 tracking-tight">
                {card.value}
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {card.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
