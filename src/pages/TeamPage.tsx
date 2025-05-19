
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';

const TeamPage = () => {
  return (
    <DashboardLayout>
      <div className="h-full">
        <div className="flex flex-col space-y-8 pb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your team members and access permissions.
            </p>
          </div>
          
          <TeamMembers />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
