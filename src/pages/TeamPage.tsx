
import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';
import { TeamAgents } from '@/components/team/TeamAgents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleCheck } from '@/components/auth/RoleCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('members');
  const { user } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const navigate = useNavigate();
  
  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (user && !isCompanyOwner && !can.manageTeam) {
      navigate('/dashboard');
    }
  }, [user, isCompanyOwner, can.manageTeam, navigate]);
  
  if (!isCompanyOwner && !can.manageTeam) {
    return <DashboardLayout>
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    </DashboardLayout>;
  }
  
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
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="members">Team Members</TabsTrigger>
                <TabsTrigger value="agents">AI Agents</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="members" className="space-y-4">
              <RoleCheck 
                adminOnly
                fallback={
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Only administrators can manage team members. Please contact your administrator for assistance.
                    </AlertDescription>
                  </Alert>
                }
              >
                <TeamMembers />
              </RoleCheck>
            </TabsContent>
            
            <TabsContent value="agents" className="space-y-4">
              <RoleCheck 
                allowedAction="manageAgents"
                adminOnly
                fallback={
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Only administrators can manage AI agents. You can only view agents assigned to you.
                    </AlertDescription>
                  </Alert>
                }
              >
                <TeamAgents />
              </RoleCheck>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
