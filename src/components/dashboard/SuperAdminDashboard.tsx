
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
  Activity,
  AlertTriangle 
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
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
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
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{globalMetrics?.total_users || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{globalMetrics?.total_companies || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{calls?.length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                ${(globalMetrics?.total_cost || 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Company Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-4">
              {companyMetrics?.map((company: any) => (
                <div key={company.company_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{company.company_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {company.total_calls} calls • {company.total_users} users
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(company.total_cost || 0).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                </div>
              )) || (
                <p className="text-center text-muted-foreground py-4">No company data available</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Global Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Total Agents</p>
                <p className="text-2xl font-bold">{agents?.length || 0}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Active Agents</p>
                <p className="text-2xl font-bold">
                  {agents?.filter((agent: any) => agent.status === 'active').length || 0}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
