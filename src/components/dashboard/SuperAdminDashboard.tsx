
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalData } from "./GlobalDataProvider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Phone, DollarSign, TrendingUp, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export function SuperAdminDashboard() {
  const { superAdminData, globalAgents, globalCalls } = useGlobalData();
  const { globalMetrics, companyMetrics, isLoading, error } = superAdminData;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-96" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-5 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Super Admin Dashboard
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">Error loading super admin data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-none">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Super Admin Dashboard 👑
        </h1>
        <p className="text-lg text-gray-600 font-medium">
          Global platform analytics and system management
        </p>
      </div>

      {/* Global Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/50 opacity-60" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Calls</CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-100 shadow-sm">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {globalMetrics?.totalCalls?.toLocaleString() || globalCalls.calls.length.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Across all companies
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 opacity-60" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Revenue</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-100 shadow-sm">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {formatCurrency(globalMetrics?.totalCost || globalCalls.calls.reduce((sum, call) => sum + (call.cost_usd || 0), 0))}
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Platform wide revenue
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100/50 opacity-60" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Agents</CardTitle>
            <div className="p-2.5 rounded-xl bg-purple-100 shadow-sm">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {globalAgents.agents.length || '0'}
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Active AI agents
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100/50 opacity-60" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Total Companies</CardTitle>
            <div className="p-2.5 rounded-xl bg-orange-100 shadow-sm">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative pt-0">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {globalMetrics?.totalCompanies || companyMetrics.length || '0'}
            </div>
            <p className="text-sm text-gray-600 font-medium">
              Active organizations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Company Performance Table */}
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Company Performance</CardTitle>
              <CardDescription className="text-sm text-gray-600 font-medium">
                Top performing companies by call volume
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {companyMetrics && companyMetrics.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div>Company</div>
                <div className="text-right">Calls</div>
                <div className="text-right">Revenue</div>
                <div className="text-right">Users</div>
              </div>
              <div className="space-y-3">
                {companyMetrics.slice(0, 10).map((company, index) => (
                  <div key={company.companyId || index} className="grid grid-cols-4 text-sm items-center py-3 px-4 rounded-lg bg-gray-50/60 hover:bg-gray-100/80 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-gray-900 truncate">{company.companyName}</span>
                    </div>
                    <div className="text-right font-bold text-gray-900">{Number(company.totalCalls).toLocaleString()}</div>
                    <div className="text-right font-bold text-green-600">{formatCurrency(Number(company.totalCost))}</div>
                    <div className="text-right font-semibold text-gray-700">{Number(company.totalUsers)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-3 rounded-full bg-gray-100 w-fit mx-auto mb-3">
                <Activity className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No company performance data available</p>
              <p className="text-sm text-gray-500 mt-1">Data will appear as companies start using the platform</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
