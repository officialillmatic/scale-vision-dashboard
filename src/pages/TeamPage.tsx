
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';
import { TeamAgents } from '@/components/team/TeamAgents';
import { UserManagementDashboard } from '@/components/team/UserManagementDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, Bot, Crown, Building2, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('agents');
  const { user } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();
  
  // Super admins should have unrestricted access - skip redirection
  useEffect(() => {
    if (user && !isSuperAdmin && !isCompanyOwner && !can.manageTeam) {
      toast.error("You don't have permission to access team management");
      navigate('/dashboard');
      return;
    }
  }, [user, isSuperAdmin, isCompanyOwner, can.manageTeam, navigate]);
  
  // Super admins should never be blocked from accessing this page
  if (!isSuperAdmin && !isCompanyOwner && !can.manageTeam) {
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
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Team Management 👥
            </h1>
            {isSuperAdmin && (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                SUPER ADMIN
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Enterprise Suite
            </Badge>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            Manage your team members, AI agents, and user assignments in one centralized location
          </p>
        </div>
        
        {/* Tabs Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b border-gray-200/60 px-6 py-4">
              <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-gray-100/80 p-1 rounded-lg">
                <TabsTrigger 
                  value="agents" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Bot className="h-4 w-4" />
                  Agent Assignment
                </TabsTrigger>
                <TabsTrigger 
                  value="members" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Users className="h-4 w-4" />
                  Team Members
                </TabsTrigger>
                <TabsTrigger 
                  value="hr" 
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <Building2 className="h-4 w-4" />
                  HR Management
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced"
                  className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  <UserCog className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="agents" className="space-y-6 mt-0">
                <TeamAgents />
              </TabsContent>
              
              <TabsContent value="members" className="space-y-6 mt-0">
                <TeamMembers />
              </TabsContent>
              
              <TabsContent value="hr" className="space-y-6 mt-0">
                <UserManagementDashboard />
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-6 mt-0">
                <div className="text-center py-8">
                  <UserCog className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Team Settings</h3>
                  <p className="text-gray-600 mb-4">
                    Advanced configuration options and bulk operations will be available here.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;
