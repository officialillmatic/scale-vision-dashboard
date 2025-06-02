
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrentUserAgents } from '@/hooks/useCurrentUserAgents';
import { useCalls } from '@/hooks/useCalls';
import { Bot, Activity, Clock } from 'lucide-react';

export function AgentStatusOverview() {
  const { data: userAgents } = useCurrentUserAgents();
  const { calls } = useCalls();

  // Calculate agent utilization
  const agentStats = userAgents?.map(assignment => {
    const agentCalls = calls.filter(call => 
      call.agent_id === assignment.agent_id && 
      new Date(call.timestamp) >= new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );
    
    const totalDuration = agentCalls.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
    const successfulCalls = agentCalls.filter(call => call.call_status === 'completed').length;
    const successRate = agentCalls.length > 0 ? (successfulCalls / agentCalls.length) * 100 : 0;

    return {
      ...assignment,
      callsToday: agentCalls.length,
      totalDuration,
      successRate,
      status: agentCalls.length > 0 ? 'active' : 'idle'
    };
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'idle': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agentStats.length > 0 ? (
            agentStats.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {agent.agent_details?.name || 'Unknown Agent'}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Activity className="w-3 h-3" />
                      <span>{agent.callsToday} calls today</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{Math.round(agent.totalDuration / 60)}m</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge variant="outline" className={getStatusColor(agent.status)}>
                    {agent.status}
                  </Badge>
                  {agent.is_primary && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      Primary
                    </Badge>
                  )}
                  <span className={`text-xs font-medium ${getSuccessRateColor(agent.successRate)}`}>
                    {agent.successRate.toFixed(0)}% success
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No agents assigned</p>
              <p className="text-sm">Contact your administrator to get an agent assigned</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
