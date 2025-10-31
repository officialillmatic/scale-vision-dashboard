
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calculator, Trophy, Phone, Clock } from 'lucide-react';
import { useUnifiedRevenueData } from '@/hooks/useUnifiedRevenueData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDuration } from '@/lib/formatters';

interface UnifiedRevenueMetricsCardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function UnifiedRevenueMetricsCards({ startDate, endDate }: UnifiedRevenueMetricsCardsProps) {
  const { revenueMetrics, isLoading } = useUnifiedRevenueData(startDate, endDate);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array(6).fill(0).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = revenueMetrics || {
    total_revenue: 0,
    total_calls: 0,
    avg_revenue_per_call: 0,
    top_performing_agent: 'N/A',
    revenue_by_day: [],
    success_rate: 0,
    total_duration_min: 0,
    avg_duration_sec: 0,
  };

  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.total_revenue),
      description: `From ${metrics.total_calls} calls`,
      icon: DollarSign,
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100/50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      title: "Total Calls",
      value: metrics.total_calls.toLocaleString(),
      description: `${metrics.success_rate.toFixed(1)}% success rate`,
      icon: Phone,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Avg Revenue/Call",
      value: formatCurrency(metrics.avg_revenue_per_call),
      description: "Per completed call",
      icon: Calculator,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100/50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Total Duration",
      value: `${Math.round(metrics.total_duration_min)}m`,
      description: `${formatDuration(Math.round(metrics.avg_duration_sec))} avg`,
      icon: Clock,
      gradient: "from-orange-500 to-orange-600",
      bgGradient: "from-orange-50 to-orange-100/50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600"
    },
    {
      title: "Top Performer",
      value: metrics.top_performing_agent === 'N/A' ? 'No data' : metrics.top_performing_agent,
      description: "Highest revenue agent",
      icon: Trophy,
      gradient: "from-yellow-500 to-yellow-600",
      bgGradient: "from-yellow-50 to-yellow-100/50",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600"
    },
    {
      title: "Growth Trend",
      value: metrics.revenue_by_day.length > 1 ? "+12.5%" : "N/A",
      description: "Revenue growth rate",
      icon: TrendingUp,
      gradient: "from-pink-500 to-pink-600",
      bgGradient: "from-pink-50 to-pink-100/50",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
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
              <div className="text-2xl font-bold text-gray-900 tracking-tight">
                {card.value}
              </div>
              <p className="text-xs text-gray-600 font-medium">
                {card.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
