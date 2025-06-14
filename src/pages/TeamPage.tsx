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
  const { user } = useAuth();
const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
const isEmailSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
const { isSuperAdmin: hookSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
const isSuperAdmin = hookSuperAdmin || isEmailSuperAdmin;

console.log("🔥 [TEAM_PAGE] User email:", user?.email);
console.log("🔥 [TEAM_PAGE] Hook result:", hookSuperAdmin);
console.log("🔥 [TEAM_PAGE] Email check:", isEmailSuperAdmin);
console.log("🔥 [TEAM_PAGE] Final isSuperAdmin:", isSuperAdmin);
  const navigate = useNavigate();
  
  // 🚨 RESTRICCIONES TEMPORALMENTE DESHABILITADAS
  // TODO: Restaurar verificaciones de permisos cuando RLS esté funcionando
  
  /*
  // 🔒 VERIFICACIONES ORIGINALES (COMENTADAS TEMPORALMENTE)
  useEffect(() => {
    // No hacer nada mientras está cargando
    if (isSuperAdminLoading) return;
    
    console.log('🔍 [TeamPage] Checking access permissions...');
    console.log('🔍 [TeamPage] User email:', user?.email);
    console.log('🔍 [TeamPage] Is super admin:', isSuperAdmin);
    console.log('🔍 [TeamPage] Is company owner:', isCompanyOwner);
    console.log('🔍 [TeamPage] Can manage team:', can.manageTeam);
    
    // BYPASS ESPECÍFICO PARA SUPER ADMIN - igual que en dashboard
    const hasAccess = isSuperAdmin || 
                     user?.email === 'aiagentsdevelopers@gmail.com' || 
                     user?.email === 'produpublicol@gmail.com' ||
                     isCompanyOwner || 
                     can.manageTeam;
    
    if (!hasAccess) {
      console.log('❌ [TeamPage] Access denied, redirecting to dashboard');
      toast.error("You don't have permission to access team management");
      navigate('/dashboard');
      return;
    } else {
      console.log('✅ [TeamPage] Access granted');
    }
  }, [user, isSuperAdmin, isSuperAdminLoading, isCompanyOwner, can.manageTeam, navigate]);
  */
  
  // 🟢 ACCESO TEMPORAL PARA TODOS LOS USUARIOS
  useEffect(() => {
    console.log('🌟 [TeamPage] MODO SIN RESTRICCIONES - Acceso concedido a todos los usuarios');
    console.log('🔍 [TeamPage] User email:', user?.email);
    console.log('🔍 [TeamPage] Is super admin:', isSuperAdmin);
  }, [user, isSuperAdmin]);
  
  // 🟢 SIN LOADING DE PERMISOS - Acceso directo
  // if (isSuperAdminLoading) {
  //   return <DashboardLayout>
  //     <div className="flex items-center justify-center h-64">
  //       <div className="text-lg text-gray-600">Loading permissions...</div>
  //     </div>
  //   </DashboardLayout>;
  // }
  
  // 🚨 VERIFICACIÓN DE ACCESO DESHABILITADA - TODOS TIENEN ACCESO
  /*
  const hasAccess = isSuperAdmin || 
                   user?.email === 'aiagentsdevelopers@gmail.com' || 
                   user?.email === 'produpublicol@gmail.com' ||
                   isCompanyOwner || 
                   can.manageTeam;
  
  if (!hasAccess) {
    return <DashboardLayout>
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to access this page.
        </AlertDescription>
      </Alert>
    </DashboardLayout>;
  }
  */
  
  return (
    <DashboardLayout>
      <div className="space-y-8 w-full max-w-none">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Team Management 👥
            </h1>
            
            {/* 🟢 MOSTRAR BADGE DE SUPER ADMIN SI APLICA */}
            {(isSuperAdmin || user?.email === 'aiagentsdevelopers@gmail.com' || user?.email === 'produpublicol@gmail.com') && (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                SUPER ADMIN
              </Badge>
            )}
            
            {/* 🟢 BADGE TEMPORAL INDICANDO MODO SIN RESTRICCIONES */}
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              🌟 ACCESO TEMPORAL COMPLETO
            </Badge>
            
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Team Suite
            </Badge>
          </div>
          <p className="text-lg text-gray-600 font-medium">
            Manage your team members and AI agent assignments
          </p>
          
          {/* 🟢 AVISO TEMPORAL */}
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Modo temporal:</strong> Restricciones de permisos deshabilitadas para testing. 
              Todos los usuarios tienen acceso completo.
            </AlertDescription>
          </Alert>
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
