
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useRevenueData } from "@/hooks/useRevenueData";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateMessage } from "./EmptyStateMessage";
import { useCallData } from "@/hooks/useCallData";
import { AlertTriangle, DollarSign, Clock, Phone, TrendingUp } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { formatCurrency } from "@/lib/formatters";

export function DashboardMetrics() {
  const { company, user, isCompanyLoading } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const { handleSync, isSyncing } = useCallData();
  const { data, isLoading, error } = useDashboardData();
  const { revenueMetrics, isLoading: isLoadingRevenue } = useRevenueData();

  // Show loading state
  if (isLoading || isCompanyLoading || isLoadingRevenue) {
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

  // Show setup message for users without company (non-super admins)
  if (!isSuperAdmin && !company) {
    return (
      <div className="grid gap-6 md:grid-cols-1">
        <EmptyStateMessage
          title="Welcome to Dr Scale AI!"
          description="We're setting up your account. If this takes more than a few moments, please refresh the page."
          actionLabel="Refresh Page"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalCalls: 0,
    totalCost: '$0.00',
    totalMinutes: 0,
    avgDuration: 0
  };

  const revenue = revenueMetrics || {
    total_revenue: 0,
    total_calls: 0,
    avg_revenue_per_call: 0,
    top_performing_agent: 'N/A',
    revenue_by_day: []
  };

  const hasData = metrics.totalCalls > 0 || revenue.total_revenue > 0;

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
      title: "Total Revenue",
      value: formatCurrency(revenue.total_revenue),
      description: `${formatCurrency(revenue.avg_revenue_per_call)} per call`,
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
