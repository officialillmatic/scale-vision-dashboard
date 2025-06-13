import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
// 🚨 CAMBIO: Usar componente emergency que funciona
import { EmergencyCreditPanel } from '@/components/EmergencyCreditPanel';

export default function SuperAdminCreditPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* 🚨 CAMBIO: Reemplazar componente roto con componente que funciona */}
        <EmergencyCreditPanel />
      </div>
    </DashboardLayout>
  );
}