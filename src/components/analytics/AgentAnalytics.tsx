
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CallData } from '@/types/analytics';
import { formatCurrency, formatDuration } from '@/lib/formatters';
import { Bot, TrendingUp, Clock, DollarSign } from 'lucide-react';

interface AgentAnalyticsProps {
  data: CallData[];
}

export function AgentAnalytics({ data }: AgentAnalyticsProps) {
  const agentMetrics = React.useMemo(() => {
    const agentStats = data.reduce((acc, call) => {
      const agentId = call.agent?.id || 'unknown';
      const agentName = call.agent?.name || 'Unknown Agent';
      
      if (!acc[agentId]) {
        acc[agentId] = {
          id: agentId,
          name: agentName,
          totalCalls: 0,
          successfulCalls: 0,
          totalDuration: 0,
          totalCost: 0,
          avgLatency: 0,
          latencyCount: 0,
          lastCallDate: null as Date | null,
          callsByStatus: {} as Record<string, number>
        };
      }

      const agent = acc[agentId];
      agent.totalCalls++;
      agent.totalDuration += call.duration_sec || 0;
      agent.totalCost += call.cost_usd || 0;

      if (call.call_status === 'completed') {
        agent.successfulCalls++;
      }

      if (call.latency_ms) {
        agent.avgLatency = ((agent.avgLatency * agent.latencyCount) + call.latency_ms) / (agent.latencyCount + 1);
        agent.latencyCount++;
      }

      if (!agent.lastCallDate || new Date(call.timestamp) > agent.lastCallDate) {
        agent.lastCallDate = new Date(call.timestamp);
      }

      agent.callsByStatus[call.call_status] = (agent.callsByStatus[call.call_status] || 0) + 1;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(agentStats)
      .map((agent: any) => ({
        ...agent,
        successRate: agent.totalCalls > 0 ? (agent.successfulCalls / agent.totalCalls) * 100 : 0,
        avgDuration: agent.totalCalls > 0 ? agent.totalDuration / agent.totalCalls : 0,
        avgCostPerCall: agent.totalCalls > 0 ? agent.totalCost / agent.totalCalls : 0,
        utilizationScore: Math.min(100, (agent.totalCalls / Math.max(1, data.length / Object.keys(agentStats).length)) * 100)
      }))
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }, [data]);

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800';
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getUtilizationColor = (score: number) => {
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Top Performing Agents Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {agentMetrics.slice(0, 3).map((agent, index) => (
          <Card key={agent.id} className={`border-l-4 ${
            index === 0 ? 'border-l-gold' : 
            index === 1 ? 'border-l-silver' : 
            'border-l-bronze'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Bot className="h-5 w-5" />
                <span>{agent.name}</span>
                <Badge variant="outline" className="ml-auto">
                  #{index + 1}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Total Calls</p>
                  <p className="font-semibold text-lg">{agent.totalCalls}</p>
                </div>
                <div>
                  <p className="text-gray-600">Success Rate</p>
                  <p className="font-semibold text-lg">{agent.successRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Duration</p>
                  <p className="font-semibold">{formatDuration(Math.round(agent.avgDuration))}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Revenue</p>
                  <p className="font-semibold">{formatCurrency(agent.totalCost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Detailed Agent Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">Total Calls</TableHead>
                  <TableHead className="text-center">Success Rate</TableHead>
                  <TableHead className="text-center">Avg Duration</TableHead>
                  <TableHead className="text-center">Cost per Call</TableHead>
                  <TableHead className="text-center">Total Revenue</TableHead>
                  <TableHead className="text-center">Utilization</TableHead>
                  <TableHead className="text-center">Avg Latency</TableHead>
                  <TableHead className="text-center">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentMetrics.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {agent.totalCalls}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getPerformanceColor(agent.successRate)}>
                        {agent.successRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDuration(Math.round(agent.avgDuration))}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(agent.avgCostPerCall)}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {formatCurrency(agent.totalCost)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getUtilizationColor(agent.utilizationScore)}>
                        {agent.utilizationScore.toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {agent.avgLatency > 0 ? `${Math.round(agent.avgLatency)}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {agent.lastCallDate ? 
                        new Date(agent.lastCallDate).toLocaleDateString() : 
                        'Never'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
