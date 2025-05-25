
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';
import { TeamAgents } from '@/components/team/TeamAgents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleCheck } from '@/components/auth/RoleCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('members');
  const { user } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const navigate = useNavigate();
  
  // Redirect non-admin users to dashboard with enhanced security
  useEffect(() => {
    if (user && !isCompanyOwner && !can.manageTeam) {
      toast.error("You don't have permission to access team management");
      navigate('/dashboard');
      return;
    }
  }, [user, isCompanyOwner, can.manageTeam, navigate]);
  
  // Additional security check to prevent unauthorized access
  if (!isCompanyOwner && !can.manageTeam) {
    return <DashboardLayout>
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    </DashboardLayout>;
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-8 w-full max-w-none">
        {/* Header Section */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Team Management 👥
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Manage your team members and AI agents with complete control
          </p>
        </div>
        
        {/* Tabs Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b border-gray-200/60 px-6 py-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100/80 p-1 rounded-lg">
                <TabsTrigger 
                  value="members" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  Team Members
                </TabsTrigger>
                <TabsTrigger 
                  value="agents"
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Bot className="h-4 w-4" />
                  AI Agents
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="members" className="space-y-6 mt-0">
                <RoleCheck 
                  allowedAction="sendInvitations"
                  fallback={
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
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
              
              <TabsContent value="agents" className="space-y-6 mt-0">
                <RoleCheck 
                  allowedAction="manageAgents"
                  adminOnly
                  fallback={
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
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
            </div>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
