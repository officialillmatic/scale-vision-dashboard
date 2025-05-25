
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { EnvWarning } from '@/components/common/EnvWarning';
import { useAuth } from '@/contexts/AuthContext';
import { UserBalance } from '@/components/balance/UserBalance';
import { AgentUsageStats } from '@/components/calls/AgentUsageStats';
import { WebhookMonitor } from '@/components/admin/WebhookMonitor';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { RoleCheck } from '@/components/auth/RoleCheck';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { CallTable } from '@/components/calls/CallTable';
import { CallData } from '@/services/callService';

export function DashboardPage() {
  const { company, isLoading: isLoadingAuth } = useAuth();

  const handleSelectCall = (call: CallData) => {
    console.log('Selected call:', call);
  };

  return (
    <DashboardLayout isLoading={isLoadingAuth}>
      <EnvWarning />
      
      <div className="space-y-8 w-full max-w-none">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Welcome to {company?.name || 'EchoWave'}! Monitor your call analytics and agent performance.
          </p>
        </div>
        
        {/* Key Metrics */}
        <div className="w-full">
          <DashboardMetrics />
        </div>
        
        {/* Charts */}
        <div className="w-full">
          <DashboardCharts />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 w-full">
          <UserBalance />
          <AgentUsageStats />
        </div>

        {/* Admin monitoring section */}
        <RoleCheck adminOnly>
          <div className="grid gap-6 md:grid-cols-2 w-full">
            <WebhookMonitor />
            <SystemHealth />
          </div>
        </RoleCheck>
        
        {/* Recent Calls Table */}
        <div className="space-y-4 w-full">
          <h2 className="text-xl font-semibold">Recent Calls</h2>
          <CallTable onSelectCall={handleSelectCall} />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
