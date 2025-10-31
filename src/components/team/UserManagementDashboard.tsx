
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserManagementOverview } from './UserManagementOverview';
import { UsersList } from './UsersList';
import { DepartmentManager } from './DepartmentManager';
import { UserActivityTracker } from './UserActivityTracker';
import { BulkActionsPanel } from './BulkActionsPanel';
import { PerformanceTracker } from './PerformanceTracker';
import { OnboardingManager } from './OnboardingManager';
import { RolePermissionsManager } from './RolePermissionsManager';
import { Users, Building2, Activity, Zap, TrendingUp, GraduationCap, Shield, UserPlus } from 'lucide-react';

export function UserManagementDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'users', label: 'Users', icon: UserPlus },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'bulk-actions', label: 'Bulk Actions', icon: Zap },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'onboarding', label: 'Onboarding', icon: GraduationCap },
    { id: 'permissions', label: 'Permissions', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Complete HR and team management solution</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Enterprise Ready
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <UserManagementOverview />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersList />
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <DepartmentManager />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <UserActivityTracker />
        </TabsContent>

        <TabsContent value="bulk-actions" className="space-y-6">
          <BulkActionsPanel />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceTracker />
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-6">
          <OnboardingManager />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <RolePermissionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
