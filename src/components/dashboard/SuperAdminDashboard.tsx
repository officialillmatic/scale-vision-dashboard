
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Activity, Database, Settings } from "lucide-react";
import { SystemHealth } from "@/components/admin/SystemHealth";
import { WebhookMonitor } from "@/components/admin/WebhookMonitor";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";
import { ProductionReadinessPanel } from "@/components/admin/ProductionReadinessPanel";
import { useSuperAdminData } from "@/hooks/useSuperAdminData";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const SuperAdminDashboard = () => {
  const { globalMetrics, companyMetrics, isLoading, error } = useSuperAdminData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load super admin data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics?.totalCompanies || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls (30d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalMetrics?.totalCalls || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (30d)</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(globalMetrics?.totalCost || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Readiness Panel */}
      <ProductionReadinessPanel />

      {/* Detailed Admin Sections */}
      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>
        
        <TabsContent value="system">
          <SystemHealth />
        </TabsContent>
        
        <TabsContent value="webhooks">
          <WebhookMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
};
