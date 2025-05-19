
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { CompanyMember } from '@/services/companyService';
import { TeamAgents } from '@/components/team/TeamAgents';

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('members');
  
  return (
    <DashboardLayout>
      <div className="h-full">
        <div className="flex flex-col space-y-8 pb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your team members and AI agents.
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full space-y-6">
            <div className="space-between flex items-center">
              <TabsList>
                <TabsTrigger value="members">Team Members</TabsTrigger>
                <TabsTrigger value="agents">AI Agents</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="members" className="space-y-4">
              <TeamMembers />
            </TabsContent>
            
            <TabsContent value="agents" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">AI Agents</h2>
                <p className="text-muted-foreground">
                  This feature will be coming soon.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
