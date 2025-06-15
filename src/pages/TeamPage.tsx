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
  Eye,
  Download,
  Settings,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle
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
  
  // Estados para cada pestaña
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Estados de filtrado
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);

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
  }, [teamMembers, agents, companies, searchQuery, activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
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

      console.log('📊 Raw users data:', usersData?.length || 0);

      if (!usersData || usersData.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Obtener datos adicionales de manera segura
      const [creditsResult, profilesResult] = await Promise.all([
        supabase.from('user_credits').select('user_id, current_balance').then(r => r.data || []),
        supabase.from('user_profiles').select('id, email, name, role, company_id').then(r => r.data || [])
      ]);

      // Combinar datos
      const combinedMembers: TeamMember[] = usersData.map(user => {
        const profile = profilesResult.find(p => p.id === user.id);
        const credit = creditsResult.find(c => c.user_id === user.id);

        return {
          id: user.id,
          email: user.email || profile?.email || `user-${user.id.slice(0, 8)}`,
          name: user.name || user.full_name || profile?.name || user.email || 'Usuario',
          role: profile?.role || 'user',
          status: (credit?.current_balance || 0) > 0 ? 'active' : 'inactive',
          company_name: 'Empresa Principal',
          total_calls: 0,
          total_spent: 0,
          current_balance: credit?.current_balance || 0,
          created_at: user.created_at || new Date().toISOString()
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
      console.log('🔍 Fetching agents...');
      
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
        company_name: 'Empresa Principal',
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
      console.log('🔍 Fetching companies...');
      
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
        users_count: 0,
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

  const applyFilters = () => {
    const query = searchQuery.toLowerCase();

    // Filtrar miembros
    const filteredMembersResult = teamMembers.filter(member => 
      member.email.toLowerCase().includes(query) ||
      member.name.toLowerCase().includes(query)
    );
    setFilteredMembers(filteredMembersResult);

    // Filtrar agentes
    const filteredAgentsResult = agents.filter(agent => 
      agent.name.toLowerCase().includes(query) ||
      agent.retell_agent_id.toLowerCase().includes(query)
    );
    setFilteredAgents(filteredAgentsResult);

    // Filtrar empresas
    const filteredCompaniesResult = companies.filter(company => 
      company.name.toLowerCase().includes(query)
    );
    setFilteredCompanies(filteredCompaniesResult);
  };

  const organizeTeams = async () => {
    try {
      setLoading(true);
      console.log('🔧 Organizando equipos...');

      // Buscar super admin
      const { data: superAdminData } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'produpublicol@gmail.com')
        .single();

      if (!superAdminData) {
        toast.error('Super admin no encontrado');
        return;
      }

      // Buscar o crear empresa
      let { data: companies } = await supabase
        .from('companies')
        .select('*')
        .limit(1);

      let targetCompanyId;
      if (!companies || companies.length === 0) {
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({
            name: 'Empresa Principal - Admin',
            description: 'Empresa principal del sistema'
          })
          .select()
          .single();
        
        targetCompanyId = newCompany?.id;
      } else {
        targetCompanyId = companies[0].id;
      }

      // Asignar usuarios a la empresa
      const { data: allUsers } = await supabase
        .from('users')
        .select('*');

      if (allUsers && targetCompanyId) {
        for (const user of allUsers) {
          // Verificar si ya tiene perfil
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // Crear perfil nuevo
            await supabase
              .from('user_profiles')
              .insert({
                id: user.id,
                email: user.email,
                name: user.name || user.full_name || user.email || 'Usuario',
                role: user.email === 'produpublicol@gmail.com' ? 'super_admin' : 'user',
                company_id: targetCompanyId
              });
          }
        }
      }

      toast.success('✅ Equipos organizados exitosamente');
      await fetchAllData();

    } catch (error: any) {
      console.error('❌ Error organizando equipos:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const debugDatabase = async () => {
    try {
      console.log('🔍 === DEBUG: Estructura de Base de Datos ===');
      
      // Verificar tablas principales
      const tables = ['users', 'user_profiles', 'companies', 'agents', 'user_credits'];
      
      for (const table of tables) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(3);
          
          console.log(`📊 ${table}:`, {
            exists: !error,
            count: count,
            sample: data?.slice(0, 1),
            error: error?.message
          });
        } catch (e) {
          console.log(`❌ ${table}: No accesible`);
        }
      }

      toast.success('✅ Debug completado - revisa la consola');
    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
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

  // Estadísticas
  const stats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
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
        {/* Banner */}
        <Alert className="border-blue-200 bg-blue-50">
          <Activity className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Panel de Gestión de Equipos</strong> - Sistema funcional para administrar usuarios, agentes y empresas.
          </AlertDescription>
        </Alert>

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
            <Button onClick={debugDatabase} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Debug
            </Button>
            <Button onClick={organizeTeams} variant="outline" size="sm" disabled={loading}>
              <Settings className="w-4 h-4 mr-2" />
              Organizar
            </Button>
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
                  <p className="text-xs text-muted-foreground">Miembros</p>
                  <p className="text-xl font-bold">{stats.totalMembers}</p>
                  <p className="text-xs text-green-600">{stats.activeMembers} activos</p>
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

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Empresas</p>
                  <p className="text-xl font-bold">{stats.totalCompanies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <p className="text-lg font-bold text-green-600">Activo</p>
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
                    <p className="text-gray-600 mb-4">Intenta organizar los equipos primero.</p>
                    <Button onClick={organizeTeams} variant="outline" disabled={loading}>
                      <Settings className="w-4 h-4 mr-2" />
                      Organizar Equipos
                    </Button>
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
                            
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                              {member.status === 'active' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {member.status}
                            </Badge>
                            
                            {member.role === 'super_admin' && (
                              <Badge variant="destructive">
                                <Crown className="h-3 w-3 mr-1" />
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                            <span>Empresa: <strong>{member.company_name || 'Sin asignar'}</strong></span>
                            <span>Balance: <strong className="text-green-600">{formatCurrency(member.current_balance)}</strong></span>
                            <span>Llamadas: <strong>{member.total_calls}</strong></span>
                            <span>Creado: <strong>{formatDate(member.created_at)}</strong></span>
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

              {/* Tab: Agentes */}
              <TabsContent value="agents" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Agentes AI ({filteredAgents.length})</h3>
                </div>

                {filteredAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron agentes</h3>
                    <p className="text-gray-600">Los agentes aparecerán aquí cuando se agreguen.</p>
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
                            <span>Empresa: <strong>{agent.company_name || 'Sin asignar'}</strong></span>
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
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron empresas</h3>
                    <p className="text-gray-600">Las empresas aparecerán aquí cuando se agreguen.</p>
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
