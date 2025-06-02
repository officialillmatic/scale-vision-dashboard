
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCalls } from '@/hooks/useCalls';
import { useCurrentUserAgents } from '@/hooks/useCurrentUserAgents';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Phone, Bot, Target, DollarSign } from 'lucide-react';

export function DashboardKPICards() {
  const { calls } = useCalls();
  const { data: userAgents } = useCurrentUserAgents();

  // Calculate today's metrics
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayCalls = calls.filter(call => new Date(call.timestamp) >= startOfToday);
  
  // Calculate this week's metrics
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekCalls = calls.filter(call => new Date(call.timestamp) >= startOfWeek);
  
  // Calculate success rate
  const successfulCalls = calls.filter(call => call.call_status === 'completed');
  const successRate = calls.length > 0 ? (successfulCalls.length / calls.length) * 100 : 0;
  
  // Calculate revenue
  const totalRevenue = calls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const todayRevenue = todayCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  
  // Active agents count
  const activeAgents = userAgents?.length || 0;

  const kpis = [
    {
      title: "Today's Calls",
      value: todayCalls.length.toLocaleString(),
      subtitle: `${weekCalls.length} this week`,
      icon: Phone,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: todayCalls.length > 0 ? "up" : "flat"
    },
    {
      title: "Active Agents",
      value: activeAgents.toLocaleString(),
      subtitle: "Available now",
      icon: Bot,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "up"
    },
    {
      title: "Success Rate",
      value: `${successRate.toFixed(1)}%`,
      subtitle: "Last 30 days",
      icon: Target,
      color: successRate >= 80 ? "text-green-600" : successRate >= 60 ? "text-yellow-600" : "text-red-600",
      bgColor: successRate >= 80 ? "bg-green-50" : successRate >= 60 ? "bg-yellow-50" : "bg-red-50",
      trend: successRate >= 80 ? "up" : successRate >= 60 ? "flat" : "down"
    },
    {
      title: "Revenue",
      value: formatCurrency(totalRevenue),
      subtitle: `${formatCurrency(todayRevenue)} today`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: todayRevenue > 0 ? "up" : "flat"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {kpi.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
              </div>
              <div className="flex items-center">
                {kpi.trend === "up" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Good
                  </Badge>
                )}
                {kpi.trend === "down" && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Low
                  </Badge>
                )}
                {kpi.trend === "flat" && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                    Stable
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
