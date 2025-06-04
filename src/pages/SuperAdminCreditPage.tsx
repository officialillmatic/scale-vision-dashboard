
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { SuperAdminCreditPanel } from '@/components/admin/SuperAdminCreditPanel';

export default function SuperAdminCreditPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <SuperAdminCreditPanel />
      </div>
    </DashboardLayout>
  );
}
