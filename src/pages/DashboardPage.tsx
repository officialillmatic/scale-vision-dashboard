import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EnvWarning } from '@/components/common/EnvWarning';

export function DashboardPage() {
  return (
    <DashboardLayout>
      <EnvWarning />
      {/* Dashboard content here */}
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to EchoWave! This is your dashboard where you can track call metrics,
          agent performance, and manage your voice AI system.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
