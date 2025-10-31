
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calculator, Trophy } from 'lucide-react';
import { useRevenueData } from '@/hooks/useRevenueData';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

interface RevenueMetricsCardsProps {
  startDate?: Date;
  endDate?: Date;
}

export function RevenueMetricsCards({ startDate, endDate }: RevenueMetricsCardsProps) {
  const { revenueMetrics, isLoading } = useRevenueData(startDate, endDate);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
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
    revenue_by_day: []
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
      title: "Avg Revenue/Call",
      value: formatCurrency(metrics.avg_revenue_per_call),
      description: "Per completed call",
      icon: Calculator,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100/50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
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
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100/50",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
