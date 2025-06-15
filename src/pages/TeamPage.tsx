import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  Bot, 
  Crown, 
  Plus, 
  Edit3, 
  RefreshCw,
  Activity,
  Shield,
  Settings,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  company_name?: string;
  total_calls: number;
  total_spent: number;
  current_balance: number;
  created_at: string;
  team_status: 'same_team' | 'different_team' | 'no_team';
}

interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
  company_name?: string;
  assigned_users: number;
  total_calls: number;
  status: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  users_count: number;
  agents_count: number;
  status: string;
  created_at: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAssigning, setAutoAssigning] = useState(false);
  
  // Estados para cada pestaña
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Estados de filtrado
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);

  // Información del equipo principal
  const [mainTeamInfo, setMainTeamInfo] = useState<{
    companyId: string | null;
    companyName: string | null;
    memberCount: number;
    usersNeedingAssignment: number;
  }>({
    companyId: null,
    companyName: null,
    memberCount: 0,
    usersNeedingAssignment: 0
  });

  // Verificación de super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchAllData();
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    applyFilters();
  }, [teamMembers, agents, companies, searchQuery]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMainTeamInfo(),
        fetchTeamMembers(),
        fetchAgents(),
        fetchCompanies()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos del equipo');
    } finally {
      setLoading(false);
    }
  };

  // Función clave: Buscar el equipo del super admin
  const fetchMainTeamInfo = async () => {
    try {
      console.log('🔍 Buscando equipo de produpublicol@gmail.com...');

      // 1. Buscar el super admin en users
      const { data: superAdminUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', 'produpublicol@gmail.com')
        .single();

      if (!superAdminUser) {
        console.log('❌ Super admin no encontrado en users');
        return;
      }

      console.log('✅ Super admin encontrado:', superAdminUser);

      // 2. Buscar perfil del super admin para obtener su company_id
      const { data: superAdminProfile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', superAdminUser.id)
        .single();

      let targetCompanyId = superAdminProfile?.company_id;
      let targetCompanyName = null;

      // 3. Si no tiene company_id, buscar por email en user_profiles
      if (!targetCompanyId) {
        const { data: profileByEmail } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('email', 'produpublicol@gmail.com')
          .single();
        
        targetCompanyId = profileByEmail?.company_id;
      }

      // 4. Si tiene company_id, obtener nombre de la empresa
      if (targetCompanyId) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', targetCompanyId)
          .single();
        
        targetCompanyName = company?.name;
      }

      // 5. Contar usuarios en el mismo equipo
      let memberCount = 0;
      if (targetCompanyId) {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact' })
          .eq('company_id', targetCompanyId);
        
        memberCount = count || 0;
      }

      // 6. Contar usuarios que necesitan asignación
      const { data: allUsers } = await supabase
        .from('users')
        .select('id');

      const { data: usersWithProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .not('company_id', 'is', null);

      const usersNeedingAssignment = (allUsers?.length || 0) - (usersWithProfiles?.length || 0);

      setMainTeamInfo({
        companyId: targetCompanyId,
        companyName: targetCompanyName,
        memberCount,
        usersNeedingAssignment: Math.max(0, usersNeedingAssignment)
      });

      console.log('📊 Información del equipo principal:', {
        companyId: targetCompanyId,
        companyName: targetCompanyName,
        memberCount,
        usersNeedingAssignment
      });

    } catch (error) {
      console.error('❌ Error buscando equipo principal:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      console.log('🔍 Fetching team members...');
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return;
      }

      if (!usersData || usersData.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Obtener perfiles y créditos
      const [profilesResult, creditsResult] = await Promise.all([
        supabase.from('user_profiles').select('id, email, name, role, company_id'),
        supabase.from('user_credits').select('user_id, current_balance')
      ]);

      const profilesData = profilesResult.data || [];
      const creditsData = creditsResult.data || [];

      // Obtener nombres de empresas
      const companyIds = [...new Set(profilesData.map(p => p.company_id).filter(Boolean))];
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      // Combinar datos
      const combinedMembers: TeamMember[] = usersData.map(user => {
        const profile = profilesData.find(p => p.id === user.id);
        const credit = creditsData.find(c => c.user_id === user.id);
        const company = companiesData?.find(c => c.id === profile?.company_id);

        // Determinar estado del equipo
        let teamStatus: 'same_team' | 'different_team' | 'no_team' = 'no_team';
        if (profile?.company_id) {
          teamStatus = profile.company_id === mainTeamInfo.companyId ? 'same_team' : 'different_team';
        }

        return {
          id: user.id,
          email: user.email || profile?.email || `user-${user.id.slice(0, 8)}`,
          name: user.name || user.full_name || profile?.name || user.email || 'Usuario',
          role: profile?.role || 'user',
          status: (credit?.current_balance || 0) > 0 ? 'active' : 'inactive',
          company_name: company?.name || (profile?.company_id ? 'Empresa Desconocida' : 'Sin equipo'),
          total_calls: 0,
          total_spent: 0,
          current_balance: credit?.current_balance || 0,
          created_at: user.created_at || new Date().toISOString(),
          team_status: teamStatus
        };
      });

      setTeamMembers(combinedMembers);
      console.log('✅ Team members loaded:', combinedMembers.length);

    } catch (error: any) {
      console.error('❌ Error fetching team members:', error);
      toast.error(`Error al cargar miembros: ${error.message}`);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*');

      if (agentsError) {
        console.error('❌ Error fetching agents:', agentsError);
        return;
      }

      if (!agentsData) {
        setAgents([]);
        return;
      }

      const combinedAgents: Agent[] = agentsData.map(agent => ({
        id: agent.id,
        name: agent.name || 'Agente Sin Nombre',
        retell_agent_id: agent.retell_agent_id || 'N/A',
        company_name: mainTeamInfo.companyName || 'Empresa Principal',
        assigned_users: 0,
        total_calls: 0,
        status: 'active',
        created_at: agent.created_at || new Date().toISOString()
      }));

      setAgents(combinedAgents);
      console.log('✅ Agents loaded:', combinedAgents.length);

    } catch (error: any) {
      console.error('❌ Error fetching agents:', error);
      toast.error(`Error al cargar agentes: ${error.message}`);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*');

      if (companiesError) {
        console.error('❌ Error fetching companies:', companiesError);
        return;
      }

      if (!companiesData) {
        setCompanies([]);
        return;
      }

      const combinedCompanies: Company[] = companiesData.map(company => ({
        id: company.id,
        name: company.name || 'Empresa Sin Nombre',
        users_count: company.id === mainTeamInfo.companyId ? mainTeamInfo.memberCount : 0,
        agents_count: 0,
        status: 'active',
        created_at: company.created_at || new Date().toISOString()
      }));

      setCompanies(combinedCompanies);
      console.log('✅ Companies loaded:', combinedCompanies.length);

    } catch (error: any) {
      console.error('❌ Error fetching companies:', error);
      toast.error(`Error al cargar empresas: ${error.message}`);
    }
  };

  // Función principal: Asignar automáticamente al equipo
  const autoAssignToMainTeam = async () => {
    try {
      setAutoAssigning(true);
      console.log('🚀 Iniciando asignación automática al equipo principal...');

      // 1. Verificar que tenemos información del equipo principal
      if (!mainTeamInfo.companyId) {
        console.log('🏢 No hay equipo principal definido, creando uno...');
        
        // Crear empresa principal
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: 'Equipo Principal',
            description: 'Equipo principal del administrador'
          })
          .select()
          .single();

        if (companyError) {
          throw new Error(`Error creando empresa: ${companyError.message}`);
        }

        // Actualizar información del equipo principal
        setMainTeamInfo(prev => ({
          ...prev,
          companyId: newCompany.id,
          companyName: newCompany.name
        }));

        console.log('✅ Empresa principal creada:', newCompany);
      }

      const targetCompanyId = mainTeamInfo.companyId;

      // 2. Obtener todos los usuarios
      const { data: allUsers } = await supabase
        .from('users')
        .select('*');

      if (!allUsers || allUsers.length === 0) {
        toast.warning('No se encontraron usuarios para asignar');
        return;
      }

      console.log(`👥 Procesando ${allUsers.length} usuarios...`);

      let assignedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      // 3. Procesar cada usuario
      for (const user of allUsers) {
        try {
          // Verificar si ya tiene perfil
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id, company_id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // Crear nuevo perfil
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: user.id,
                email: user.email,
                name: user.name || user.full_name || user.email || 'Usuario',
                role: user.email === 'produpublicol@gmail.com' ? 'super_admin' : 'user',
                company_id: targetCompanyId
              });

            if (insertError) {
              console.error(`❌ Error creando perfil para ${user.email}:`, insertError);
              errorCount++;
            } else {
              console.log(`✅ Perfil creado para: ${user.email}`);
              assignedCount++;
            }
          } else if (!existingProfile.company_id || existingProfile.company_id !== targetCompanyId) {
            // Actualizar perfil existente
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ company_id: targetCompanyId })
              .eq('id', user.id);

            if (updateError) {
              console.error(`❌ Error actualizando perfil para ${user.email}:`, updateError);
              errorCount++;
            } else {
              console.log(`✅ Perfil actualizado para: ${user.email}`);
              updatedCount++;
            }
          }
        } catch (error) {
          console.error(`❌ Error procesando usuario ${user.email}:`, error);
          errorCount++;
        }
      }

      // 4. Mostrar resultados
      const totalProcessed = assignedCount + updatedCount;
      if (totalProcessed > 0) {
        toast.success(`✅ ¡Equipo organizado! ${assignedCount} usuarios agregados, ${updatedCount} actualizados`);
      } else if (errorCount > 0) {
        toast.error(`❌ Hubo ${errorCount} errores durante el proceso`);
      } else {
        toast.info('ℹ️ Todos los usuarios ya estaban asignados al equipo correcto');
      }

      console.log('📊 Resumen de asignación:', {
        assignedCount,
        updatedCount,
        errorCount,
        totalProcessed
      });

      // 5. Recargar datos
      await fetchAllData();

    } catch (error: any) {
      console.error('❌ Error en asignación automática:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setAutoAssigning(false);
    }
  };

  const applyFilters = () => {
    const query = searchQuery.toLowerCase();

    const filteredMembersResult = teamMembers.filter(member => 
      member.email.toLowerCase().includes(query) ||
      member.name.toLowerCase().includes(query)
    );
    setFilteredMembers(filteredMembersResult);

    const filteredAgentsResult = agents.filter(agent => 
      agent.name.toLowerCase().includes(query) ||
      agent.retell_agent_id.toLowerCase().includes(query)
    );
    setFilteredAgents(filteredAgentsResult);

    const filteredCompaniesResult = companies.filter(company => 
      company.name.toLowerCase().includes(query)
    );
    setFilteredCompanies(filteredCompaniesResult);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTeamStatusBadge = (teamStatus: string) => {
    switch (teamStatus) {
      case 'same_team':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />En equipo</Badge>;
      case 'different_team':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><XCircle className="h-3 w-3 mr-1" />Otro equipo</Badge>;
      case 'no_team':
        return <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Sin equipo</Badge>;
      default:
        return null;
    }
  };

  // Estadísticas
  const stats = {
    totalMembers: teamMembers.length,
    sameTeam: teamMembers.filter(m => m.team_status === 'same_team').length,
    needingAssignment: teamMembers.filter(m => m.team_status !== 'same_team').length,
    totalAgents: agents.length,
    totalCompanies: companies.length
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">Por favor inicia sesión para ver la gestión de equipos</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Acceso Denegado</h3>
              <p className="text-muted-foreground mb-4">
                Se requieren privilegios de super administrador para acceder a la gestión de equipos.
              </p>
              <p className="text-xs text-gray-400">
                Usuario actual: {user?.email || 'No autenticado'}
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Cargando gestión de equipos...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Banner informativo sobre el equipo principal */}
        {mainTeamInfo.companyName ? (
          <Alert className="border-green-200 bg-green-50">
            <UserCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Equipo Principal:</strong> {mainTeamInfo.companyName} • {mainTeamInfo.memberCount} miembros
              {stats.needingAssignment > 0 && (
                <span className="ml-2">• <strong>{stats.needingAssignment} usuarios</strong> necesitan asignación</span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Settings className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Configuración Necesaria:</strong> No se encontró un equipo principal. Haz clic en "Organizar Equipo" para configurar automáticamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 Gestión de Equipos</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.needingAssignment > 0 && (
              <Button 
                onClick={autoAssignToMainTeam} 
                disabled={autoAssigning}
                className="bg-green-600 hover:bg-green-700"
              >
                {autoAssigning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4 mr-2" />
                )}
                Organizar Equipo ({stats.needingAssignment})
              </Button>
            )}
            <Button onClick={fetchAllData} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Usuarios</p>
                  <p className="text-xl font-bold">{stats.totalMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">En Equipo Principal</p>
                  <p className="text-xl font-bold text-green-600">{stats.sameTeam}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Necesitan Asignación</p>
                  <p className="text-xl font-bold text-red-600">{stats.needingAssignment}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Agentes AI</p>
                  <p className="text-xl font-bold">{stats.totalAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="border-0 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <TabsList className="grid w-full max-w-md grid-cols-3 bg-gray-100/80 p-1 rounded-lg">
                  <TabsTrigger value="members" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Miembros
                  </TabsTrigger>
                  <TabsTrigger value="agents" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Agentes
                  </TabsTrigger>
                  <TabsTrigger value="companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Empresas
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Tab: Miembros */}
              <TabsContent value="members" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Miembros del Equipo ({filteredMembers.length})</h3>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron miembros</h3>
                    <p className="text-gray-600 mb-4">Haz clic en "Organizar Equipo" para asignar usuarios automáticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-sm">{member.email}</p>
                            <span className="text-xs text-gray-500">({member.name})</span>
                            
                            {getTeamStatusBadge(member.team_status)}
                            
                            {member.role === 'super_admin' && (
                              <Badge variant="destructive">
                                <Crown className="h-3 w-3 mr-1" />
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                            <span>Empresa: <strong>{member.company_name}</strong></span>
                            <span>Balance: <strong className="text-green-600">{formatCurrency(member.current_balance)}</strong></span>
                            <span>Estado: <strong>{member.status}</strong></span>
                            <span>Creado: <strong>{formatDate(member.created_at)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {member.team_status !== 'same_team' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => autoAssignToMainTeam()}
                              disabled={autoAssigning}
                            >
                              <ArrowRight className="h-4 w-4 mr-1" />
                              Asignar
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Agentes */}
              <TabsContent value="agents" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Agentes AI ({filteredAgents.length})</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Agente
                  </Button>
                </div>

                {filteredAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron agentes</h3>
                    <p className="text-gray-600">Los agentes AI aparecerán aquí cuando se agreguen al sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-sm">{agent.name}</p>
                            <span className="text-xs text-gray-500">ID: {agent.retell_agent_id}</span>
                            
                            <Badge variant="default">
                              <Bot className="h-3 w-3 mr-1" />
                              {agent.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                            <span>Empresa: <strong>{agent.company_name}</strong></span>
                            <span>Usuarios: <strong>{agent.assigned_users}</strong></span>
                            <span>Llamadas: <strong>{agent.total_calls}</strong></span>
                            <span>Creado: <strong>{formatDate(agent.created_at)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Empresas */}
              <TabsContent value="companies" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Empresas ({filteredCompanies.length})</h3>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Empresa
                  </Button>
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron empresas</h3>
                    <p className="text-gray-600">Las empresas aparecerán aquí cuando se creen en el sistema.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-sm">{company.name}</p>
                            
                            <Badge variant="default">
                              <Building2 className="h-3 w-3 mr-1" />
                              {company.status}
                            </Badge>

                            {company.id === mainTeamInfo.companyId && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                <Crown className="h-3 w-3 mr-1" />
                                Equipo Principal
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                            <span>Usuarios: <strong>{company.users_count}</strong></span>
                            <span>Agentes: <strong>{company.agents_count}</strong></span>
                            <span>Estado: <strong>{company.status}</strong></span>
                            <span>Creado: <strong>{formatDate(company.created_at)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
