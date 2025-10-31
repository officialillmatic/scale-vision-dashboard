
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserDashboardMetrics } from '@/hooks/dashboard/useUserDashboardMetrics';
import { useUserBalance } from '@/hooks/useUserBalance';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Phone, Clock, DollarSign, TrendingUp, Wallet, Activity } from 'lucide-react';

export function UserDashboardKPIs() {
  const { metrics, isLoading } = useUserDashboardMetrics();
  const { balance, remainingMinutes, isLowBalance } = useUserBalance();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Account Balance",
      value: formatCurrency(balance?.balance || 0),
      description: `~${remainingMinutes} minutes left`,
      icon: Wallet,
      gradient: isLowBalance ? "from-amber-500 to-orange-500" : "from-green-500 to-emerald-500",
      bgGradient: isLowBalance ? "from-amber-50 to-orange-50" : "from-green-50 to-emerald-50",
      iconBg: isLowBalance ? "bg-amber-100" : "bg-green-100",
      iconColor: isLowBalance ? "text-amber-600" : "text-green-600"
    },
    {
      title: "Total Calls",
      value: metrics.totalCalls.toString(),
      description: `${metrics.recentCallsCount} in last 24h`,
      icon: Phone,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Call Duration",
      value: formatDuration(metrics.totalDuration),
      description: `${Math.round(metrics.avgDuration)}s avg`,
      icon: Clock,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100/50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Total Cost",
      value: formatCurrency(metrics.totalCost),
      description: "This month",
      icon: DollarSign,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      title: "Success Rate",
      value: metrics.totalCalls > 0 ? `${Math.round((metrics.completedCallsCount / metrics.totalCalls) * 100)}%` : '0%',
      description: `${metrics.completedCallsCount} completed`,
      icon: TrendingUp,
      gradient: "from-teal-500 to-cyan-500",
      bgGradient: "from-teal-50 to-cyan-50",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600"
    },
    {
      title: "Recent Activity",
      value: metrics.recentCallsCount.toString(),
      description: "Last 24 hours",
      icon: Activity,
      gradient: "from-indigo-500 to-purple-500",
      bgGradient: "from-indigo-50 to-purple-50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpiCards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
          <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-60`} />
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg} shadow-sm`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
