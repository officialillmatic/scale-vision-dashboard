
import React from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard";
import { ProductionBanner } from "@/components/common/ProductionBanner";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export default function DashboardPage() {
  const { isSuperAdmin } = useSuperAdmin();

  if (isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <ProductionBanner />
          <SuperAdminDashboard />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ProductionBanner />
        <DashboardHeader />
        <DashboardMetrics />
        <DashboardCharts />
      </div>
    </DashboardLayout>
  );
}
