
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
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Welcome back! 👋
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Monitor your AI call analytics and agent performance for <span className="font-semibold text-brand-green">{company?.name || 'your company'}</span>
          </p>
        </div>
        
        {/* Key Metrics */}
        <div className="w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Key Metrics</h2>
            <p className="text-gray-600">Your AI call performance at a glance</p>
          </div>
          <DashboardMetrics />
        </div>
        
        {/* Charts */}
        <div className="w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Trends</h2>
            <p className="text-gray-600">Track your call volume and duration over time</p>
          </div>
          <DashboardCharts />
        </div>
        
        {/* Balance and Usage */}
        <div className="grid gap-6 md:grid-cols-2 w-full">
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900">Account Balance</h3>
            <UserBalance />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900">Agent Usage</h3>
            <AgentUsageStats />
          </div>
        </div>

        {/* Admin monitoring section */}
        <RoleCheck adminOnly>
          <div className="w-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">System Monitoring</h2>
              <p className="text-gray-600">Admin tools for system health and webhooks</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 w-full">
              <WebhookMonitor />
              <SystemHealth />
            </div>
          </div>
        </RoleCheck>
        
        {/* Recent Calls Table */}
        <div className="space-y-6 w-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Recent Calls</h2>
            <p className="text-gray-600">Latest AI call activity and details</p>
          </div>
          <CallTable onSelectCall={handleSelectCall} />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
