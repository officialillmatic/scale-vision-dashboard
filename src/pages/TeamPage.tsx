
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';
import { TeamAgents } from '@/components/team/TeamAgents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
              <TeamAgents />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
