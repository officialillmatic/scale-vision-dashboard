
import React from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export default function SuperAdminTeamNew() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();

  if (isLoading) {
    return (
      <DashboardLayout isLoading={true} />
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Team 2 (Super Admin)</h1>
            <p className="text-gray-600">Enhanced team management for super administrators</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This page is under development. Advanced team management features will be available here.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
