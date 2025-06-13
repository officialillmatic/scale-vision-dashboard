import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TeamMembers } from '@/components/team/TeamMembers';
import { TeamAgents } from '@/components/team/TeamAgents';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Users, Bot, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const TeamPage = () => {
  const [activeTab, setActiveTab] = useState('members');
  const { user } = useAuth();
  const { isCompanyOwner, can } = useRole();
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const navigate = useNavigate();
  
  // Super admins should have unrestricted access - skip redirection
  useEffect(() => {
    // No hacer nada mientras está cargando
    if (isSuperAdminLoading) return;
    
    // BYPASS TEMPORAL PARA aiagentsdevelopers@gmail.com
    if (user && user.email !== 'aiagentsdevelopers@gmail.com' && !isSuperAdmin && !isCompanyOwner && !can.manageTeam) {
      toast.error("You don't have permission to access team management");
      navigate('/dashboard');
      return;
    }
  }, [user, isSuperAdmin, isSuperAdminLoading, isCompanyOwner, can.manageTeam, navigate]);
  
  // Mostrar loading mientras verifica permisos
  if (isSuperAdminLoading) {
    return <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading permissions...</div>
      </div>
    </DashboardLayout>;
  }
  
  // BYPASS TEMPORAL: Super admins should never be blocked from accessing this page
  if (user?.email !== 'aiagentsdevelopers@gmail.com' && !isSuperAdmin && !isCompanyOwner && !can.manageTeam) {
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
            {(isSuperAdmin || user?.email === 'aiagentsdevelopers@gmail.com') && (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                SUPER ADMIN
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Team Suite
            </Badge>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            Manage your team members and AI agent assignments
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
                  Agent Assignment
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="members" className="space-y-6 mt-0">
                <TeamMembers />
              </TabsContent>
              
              <TabsContent value="agents" className="space-y-6 mt-0">
                <TeamAgents />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamPage;