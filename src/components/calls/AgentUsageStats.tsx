
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardData } from '@/hooks/useDashboardData';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Activity } from "lucide-react";

export function AgentUsageStats() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error("AgentUsageStats error:", error);
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <Bot className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Agent Performance</CardTitle>
              <p className="text-sm text-red-600 font-medium">Error loading data</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 font-medium">Failed to load agent data</p>
            <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const agentUsage = data?.agentUsage || [];

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-blue-50/30" />
      <CardHeader className="relative space-y-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Bot className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">Agent Performance</CardTitle>
            <p className="text-sm text-gray-600 font-medium">Usage breakdown by AI agent</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {agentUsage && agentUsage.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div>Agent</div>
              <div className="text-right">Calls</div>
              <div className="text-right">Minutes</div>
              <div className="text-right">Cost</div>
            </div>
            <div className="space-y-3">
              {agentUsage.map((agent, index) => (
                <div key={agent.id || index} className="grid grid-cols-4 text-sm items-center py-2 px-3 rounded-lg bg-white/60 hover:bg-white/80 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"></div>
                    <span className="font-semibold text-gray-900 truncate">{agent.name}</span>
                  </div>
                  <div className="text-right font-bold text-gray-900">{agent.calls}</div>
                  <div className="text-right font-semibold text-gray-700">{Math.round(agent.minutes)}</div>
                  <div className="text-right font-bold text-green-600">{formatCurrency(agent.cost)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-3 rounded-full bg-gray-100 w-fit mx-auto mb-3">
              <Activity className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No agent usage data available</p>
            <p className="text-sm text-gray-500 mt-1">Start making calls to see agent performance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
