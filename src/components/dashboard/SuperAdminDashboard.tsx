
import React from 'react';
import { useGlobalData } from './GlobalDataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Building2, 
  Phone, 
  DollarSign, 
  TrendingUp, 
  Activity 
} from 'lucide-react';

export function SuperAdminDashboard() {
  const { 
    isSuperAdmin, 
    superAdminData, 
    globalAgents, 
    globalCalls 
  } = useGlobalData();

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Access denied: Super admin required</p>
      </div>
    );
  }

  const { globalMetrics, companyMetrics, isLoading: metricsLoading } = superAdminData;
  const { agents, isLoading: agentsLoading } = globalAgents;
  const { calls, isLoading: callsLoading } = globalCalls;

  return (
    <div className="space-y-8 w-full max-w-none">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Super Admin Dashboard 🚀
          </h1>
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            ADMIN MODE
          </Badge>
        </div>
        <p className="text-lg text-gray-600 font-medium">
          Global platform overview and management tools
        </p>
      </div>

      {/* Global Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{globalMetrics?.totalCompanies || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{globalMetrics?.totalUsers || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls (30d)</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{globalMetrics?.totalCalls || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (30d)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                ${globalMetrics?.totalCost?.toFixed(2) || '0.00'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Agents Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Global AI Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-2xl font-bold">{agents.length} Active Agents</div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.slice(0, 6).map((agent) => (
                  <div key={agent.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-gray-600">
                      Rate: ${agent.rate_per_minute}/min
                    </div>
                    <Badge variant="secondary" className="mt-1">
                      {agent.status}
                    </Badge>
                  </div>
                ))}
              </div>
              {agents.length > 6 && (
                <p className="text-sm text-gray-600">
                  And {agents.length - 6} more agents...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Global Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Global Call Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {callsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-2xl font-bold">{calls.length} Recent Calls</div>
              <div className="space-y-2">
                {calls.slice(0, 5).map((call) => (
                  <div key={call.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">Call {call.call_id}</div>
                      <div className="text-sm text-gray-600">
                        {call.timestamp.toLocaleDateString()} - Duration: {call.duration_sec}s
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${call.cost_usd.toFixed(2)}</div>
                      <Badge variant={call.call_status === 'completed' ? 'default' : 'secondary'}>
                        {call.call_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {companyMetrics.slice(0, 5).map((company, index) => (
                <div key={company.companyId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{company.companyName}</div>
                      <div className="text-sm text-gray-600">
                        {company.totalUsers} users • {company.totalCalls} calls
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${company.totalCost.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">30d revenue</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
