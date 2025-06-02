
import React from "react";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { DashboardSyncHeader } from "@/components/dashboard/DashboardSyncHeader";
import { DashboardSyncAlerts } from "@/components/dashboard/DashboardSyncAlerts";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export default function DashboardPage() {
  const { isSuperAdmin } = useSuperAdmin();

  if (isSuperAdmin) {
    return (
      <ProductionDashboardLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
            <p className="text-gray-600">Manage your AI calling platform and monitor system health.</p>
          </div>
          <SuperAdminDashboard />
        </div>
      </ProductionDashboardLayout>
    );
  }

  return (
    <ProductionDashboardLayout>
      <div className="space-y-8">
        <DashboardSyncHeader />
        <DashboardSyncAlerts />
        <DashboardMetrics />
        <DashboardCharts />
      </div>
    </ProductionDashboardLayout>
  );
}
