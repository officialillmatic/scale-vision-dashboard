// TeamPage.tsx - PARTE 1: IMPORTS Y TIPOS
// Reemplaza la sección de imports completa con esto:

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Trash2, 
  UserPlus, 
  Settings, 
  Search,
  Filter,
  RefreshCw,
  Activity,
  Shield,
  Mail,
  Calendar,
  Phone,
  Building2,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Key
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { sendInvitationEmail } from '@/services/send-invitation/email';
import { AdminPasswordManager } from '@/components/admin/AdminPasswordManager';

// 🆕 IMPORTS SEGUROS PARA RETELL API
import { 
  getAllRetellAgentsForTeam, 
  getRetellAgentDetailsForTeam, 
  verifyRetellAgentExists,
  RetellAgentDetailed 
} from '@/services/agentService';

// ========================================
// INTERFACES Y TIPOS
// ========================================

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  company_id?: string;
  company_name?: string;
  created_at: string;
  last_login?: string;
  total_calls: number;
  total_spent: number;
  current_balance: number;
  assigned_agents: number;
}

// 🆕 INTERFAZ AGENT ACTUALIZADA CON DATOS DE RETELL
interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
  company_id?: string;
  company_name?: string;
  assigned_users: number;
  total_calls: number;
  status: string;
  created_at: string;
  description?: string;
  // 🆕 NUEVOS CAMPOS DE RETELL
  voice_id?: string;
  language?: string;
  llm_id?: string;
  last_modification_time?: number;
}

interface Company {
  id: string;
  name: string;
  users_count: number;
  agents_count: number;
  total_calls: number;
  total_spent: number;
  created_at: string;
  status: string;
}

interface UserAgentAssignment {
  id: string;
  user_id: string;
  agent_id: string;
  user_email: string;
  user_name: string;
  agent_name: string;
  is_primary: boolean;
  created_at: string;
}

interface UserInvitation {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id?: string;
  company_name?: string;
  token: string;
  expires_at: string;
  invited_by: string;
  invited_by_email?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
  accepted_at?: string;
  user_id?: string;
}
// TeamPage.tsx - PARTE 2: ESTADOS Y CONFIGURACIÓN INICIAL

export default function TeamPage() {
  const { user } = useAuth();
  
  // ========================================
  // ESTADOS PRINCIPALES
  // ========================================
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para datos
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [assignments, setAssignments] = useState<UserAgentAssignment[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  
  // Estados de filtrado
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<UserAgentAssignment[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<UserInvitation[]>([]);
  
  // Estados de modales existentes
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [addAgentModal, setAddAgentModal] = useState(false);
  const [addCompanyModal, setAddCompanyModal] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });
  const [deleteMemberModal, setDeleteMemberModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    userId?: string;
    userName?: string;
  }>({ open: false });
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });

  // 🆕 NUEVOS ESTADOS PARA FUNCIONALIDAD DE AGENTES
  const [retellAgents, setRetellAgents] = useState<RetellAgentDetailed[]>([]);
  const [loadingRetellAgents, setLoadingRetellAgents] = useState(false);
  const [agentDetailsModal, setAgentDetailsModal] = useState<{
    open: boolean;
    agent?: Agent;
    retellData?: RetellAgentDetailed;
  }>({ open: false });
  const [editAgentModal, setEditAgentModal] = useState<{
    open: boolean;
    agent?: Agent;
  }>({ open: false });

  // 🆕 NUEVOS ESTADOS PARA ASIGNACIONES
  const [editAssignmentModal, setEditAssignmentModal] = useState<{
    open: boolean;
    assignment?: UserAgentAssignment;
  }>({ open: false });
  const [deleteAssignmentModal, setDeleteAssignmentModal] = useState<{
    open: boolean;
    assignment?: UserAgentAssignment;
  }>({ open: false });

  // ========================================
  // CONFIGURACIÓN Y VERIFICACIONES
  // ========================================
  
  // Verificación de super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  // useEffect principal
  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchAllData();
      
      // Listener para refrescar cuando se registra un usuario
      const handleTeamMemberRegistered = (event: any) => {
        console.log('🔄 [TeamPage] Team member registered event received:', event.detail);
        setTimeout(() => {
          console.log('🔄 [TeamPage] Refreshing team data after new registration...');
          fetchAllData();
        }, 1000);
      };

      window.addEventListener('teamMemberRegistered', handleTeamMemberRegistered);
      return () => {
        window.removeEventListener('teamMemberRegistered', handleTeamMemberRegistered);
      };
    }
  }, [user, isSuperAdmin]);

  // useEffect para filtros
  useEffect(() => {
    applyFilters();
  }, [teamMembers, agents, companies, assignments, invitations, searchQuery, statusFilter, activeTab]);
  // TeamPage.tsx - PARTE 3: FUNCIONES FETCH PRINCIPALES

  // ========================================
  // FUNCIONES FETCH PRINCIPALES
  // ========================================

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeamMembers(),
        fetchAgents(),
        fetchCompanies(),
        fetchAssignments(),
        fetchInvitations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos del equipo');
    } finally {
      setLoading(false);
    }
  };

  // Mantener función fetchTeamMembers original (no cambiar)
  const fetchTeamMembers = async () => {
    try {
      console.log('🔍 Fetching team members...');
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }

      console.log('📊 Raw users data:', usersData);

      const { data: companyMembersData, error: companyMembersError } = await supabase
        .from('company_members')
        .select(`
          user_id,
          company_id,
          role,
          created_at,
          companies:company_id (
            id,
            name
          )
        `);

      if (companyMembersError) {
        console.error('❌ Error fetching company_members:', companyMembersError);
      }

      console.log('👥 Company members data:', companyMembersData);

      if (!usersData || usersData.length === 0) {
        console.log('⚠️ No users found');
        setTeamMembers([]);
        return;
      }

      const [creditsResult, callsResult, profilesResult] = await Promise.all([
        supabase.from('user_credits').select('user_id, current_balance'),
        supabase.from('calls').select('user_id, cost_usd'),
        supabase.from('user_profiles').select('id, email, name, role, company_id')
      ]);

      const creditsData = creditsResult.data || [];
      const callsData = callsResult.data || [];
      const profilesData = profilesResult.data || [];
      const companyMembers = companyMembersData || [];

      const combinedMembers: TeamMember[] = usersData.map(user => {
        const profile = profilesData.find(p => p.id === user.id);
        const credit = creditsData.find(c => c.user_id === user.id);
        const userCalls = callsData.filter(c => c.user_id === user.id);
        const companyMember = companyMembers.find(cm => cm.user_id === user.id);

        const totalSpent = userCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const currentBalance = credit?.current_balance || 0;

        return {
          id: user.id,
          email: user.email || profile?.email || `user-${user.id.slice(0, 8)}`,
          name: user.name || user.full_name || profile?.name || user.email || 'Usuario',
          role: companyMember?.role || profile?.role || user.role || 'user',
          status: currentBalance > 0 ? 'active' : 'inactive',
          company_id: companyMember?.company_id || profile?.company_id || user.company_id,
          company_name: companyMember?.companies?.name || null,
          created_at: user.created_at || new Date().toISOString(),
          last_login: user.last_sign_in_at,
          total_calls: userCalls.length,
          total_spent: totalSpent,
          current_balance: currentBalance,
          assigned_agents: 0
        };
      });

      const sortedMembers = combinedMembers.sort((a, b) => {
        if (a.company_id && !b.company_id) return -1;
        if (!a.company_id && b.company_id) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTeamMembers(sortedMembers);
      console.log('✅ Team members loaded successfully:', sortedMembers.length);

    } catch (error: any) {
      console.error('❌ Error fetching team members:', error);
      toast.error(`Error al cargar miembros: ${error.message}`);
    }
  };

  // 🆕 NUEVA FUNCIÓN fetchAgents MEJORADA CON RETELL
  const fetchAgents = async () => {
    try {
      console.log('🔍 Fetching agents from database and Retell API...');
      
      // 1. Obtener agentes de la base de datos local
      const { data: localAgents, error: localError } = await supabase
        .from('agents')
        .select('*');

      if (localError) {
        console.error('❌ Error fetching local agents:', localError);
      }

      // 2. Obtener agentes de Retell API
      let retellAgents: RetellAgentDetailed[] = [];
      try {
        retellAgents = await getAllRetellAgentsForTeam();
        setRetellAgents(retellAgents); // Guardar para el modal
        console.log('✅ Retell agents fetched:', retellAgents.length);
      } catch (retellError) {
        console.error('⚠️ Error fetching Retell agents:', retellError);
        toast.warning('No se pudieron cargar agentes de Retell API');
      }

      // 3. Combinar datos locales con datos de Retell
      const combinedAgents: Agent[] = [];

      // Primero, agregar agentes que están en la base de datos local
      if (localAgents) {
        for (const localAgent of localAgents) {
          const retellAgent = retellAgents.find(r => r.agent_id === localAgent.retell_agent_id);
          
          combinedAgents.push({
            id: localAgent.id,
            name: retellAgent?.agent_name || localAgent.name || 'Agente Sin Nombre',
            retell_agent_id: localAgent.retell_agent_id || 'N/A',
            company_id: localAgent.company_id,
            company_name: null,
            assigned_users: 0,
            total_calls: 0,
            status: retellAgent ? 'active' : 'inactive',
            created_at: localAgent.created_at || new Date().toISOString(),
            description: localAgent.description || `Voz: ${retellAgent?.voice_id || 'N/A'}`,
            // Datos adicionales de Retell
            voice_id: retellAgent?.voice_id,
            language: retellAgent?.language,
            llm_id: retellAgent?.response_engine?.llm_id,
            last_modification_time: retellAgent?.last_modification_time
          });
        }
      }

      // 4. Agregar agentes que solo están en Retell (no sincronizados)
      for (const retellAgent of retellAgents) {
        const existsLocally = localAgents?.some(l => l.retell_agent_id === retellAgent.agent_id);
        
        if (!existsLocally) {
          combinedAgents.push({
            id: `retell-${retellAgent.agent_id}`,
            name: retellAgent.agent_name,
            retell_agent_id: retellAgent.agent_id,
            company_id: null,
            company_name: null,
            assigned_users: 0,
            total_calls: 0,
            status: 'active',
            created_at: new Date(retellAgent.created_time).toISOString(),
            description: `🔄 Agente de Retell (${retellAgent.voice_id}) - No sincronizado`,
            voice_id: retellAgent.voice_id,
            language: retellAgent.language,
            llm_id: retellAgent.response_engine?.llm_id,
            last_modification_time: retellAgent.last_modification_time
          });
        }
      }

      // 5. Ordenar agentes
      const sortedAgents = combinedAgents.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAgents(sortedAgents);
      console.log('✅ Agents loaded successfully:', sortedAgents.length);
      console.log('📊 Active agents:', sortedAgents.filter(a => a.status === 'active').length);
      console.log('🔄 Unsynced Retell agents:', sortedAgents.filter(a => a.id.startsWith('retell-')).length);

    } catch (error: any) {
      console.error('❌ Error fetching agents:', error);
      toast.error(`Error al cargar agentes: ${error.message}`);
    }
  };
  // TeamPage.tsx - PARTE 4: FUNCIONES FETCH RESTANTES

  // Mantener funciones fetchCompanies e fetchInvitations originales
  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*');

      if (companiesError) {
        console.error('❌ Error fetching companies:', companiesError);
        throw companiesError;
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
        total_calls: 0,
        total_spent: 0,
        created_at: company.created_at || new Date().toISOString(),
        status: 'active'
      }));

      setCompanies(combinedCompanies);

    } catch (error: any) {
      console.error('❌ Error fetching companies:', error);
      toast.error(`Error al cargar empresas: ${error.message}`);
    }
  };

  // 🆕 NUEVA FUNCIÓN fetchAssignments MEJORADA
  const fetchAssignments = async () => {
    try {
      console.log('🔍 Fetching user-agent assignments...');
      
      // Obtener asignaciones básicas
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_agent_assignments')
        .select(`
          id,
          user_id,
          agent_id,
          is_primary,
          created_at
        `);

      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError);
        setAssignments([]);
        return;
      }

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        return;
      }

      // Obtener información de usuarios y agentes por separado
      const userIds = [...new Set(assignmentsData.map(a => a.user_id))];
      const agentIds = [...new Set(assignmentsData.map(a => a.agent_id))];

      const [usersResult, agentsResult] = await Promise.all([
        supabase.from('users').select('id, email, name').in('id', userIds),
        supabase.from('agents').select('id, name, retell_agent_id').in('id', agentIds)
      ]);

      const usersData = usersResult.data || [];
      const agentsData = agentsResult.data || [];

      // Combinar datos
      const combinedAssignments: UserAgentAssignment[] = assignmentsData.map(assignment => {
        const user = usersData.find(u => u.id === assignment.user_id);
        const agent = agentsData.find(a => a.id === assignment.agent_id);

        return {
          id: assignment.id,
          user_id: assignment.user_id,
          agent_id: assignment.agent_id,
          user_email: user?.email || 'usuario@example.com',
          user_name: user?.name || user?.email || 'Usuario',
          agent_name: agent?.name || 'Agente',
          is_primary: assignment.is_primary || false,
          created_at: assignment.created_at || new Date().toISOString()
        };
      });

      setAssignments(combinedAssignments);
      console.log('✅ Assignments loaded successfully:', combinedAssignments.length);

    } catch (error: any) {
      console.error('❌ Error fetching assignments:', error);
      setAssignments([]);
      toast.error(`Error al cargar asignaciones: ${error.message}`);
    }
  };

  const fetchInvitations = async () => {
    try {
      console.log('🔍 Fetching invitations...');
      
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Invitations data:', invitationsData);
      console.log('❌ Invitations error:', invitationsError);

      if (invitationsError) {
        console.error('❌ Error fetching invitations:', invitationsError);
        return;
      }

      const combinedInvitations: UserInvitation[] = (invitationsData || []).map(invitation => ({
        id: invitation.id,
        email: invitation.email,
        name: invitation.email,
        role: invitation.role,
        company_id: invitation.company_id,
        company_name: null,
        token: invitation.invitation_token,
        expires_at: invitation.expires_at,
        invited_by: invitation.invited_by,
        invited_by_email: null,
        status: invitation.status || 'pending',
        created_at: invitation.created_at,
        accepted_at: invitation.accepted_at,
        user_id: invitation.accepted_by
      }));

      console.log('✅ Combined invitations:', combinedInvitations);
      setInvitations(combinedInvitations);

    } catch (error: any) {
      console.error('❌ Error fetching invitations:', error);
    }
  };

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================

  const applyFilters = () => {
    const query = searchQuery.toLowerCase();

    let filteredMembersResult = teamMembers.filter(member => 
      member.email.toLowerCase().includes(query) ||
      member.name.toLowerCase().includes(query) ||
      (member.company_name && member.company_name.toLowerCase().includes(query))
    );
    if (statusFilter !== 'all') {
      filteredMembersResult = filteredMembersResult.filter(member => member.status === statusFilter);
    }
    setFilteredMembers(filteredMembersResult);

    let filteredAgentsResult = agents.filter(agent => 
      agent.name.toLowerCase().includes(query) ||
      agent.retell_agent_id.toLowerCase().includes(query) ||
      (agent.company_name && agent.company_name.toLowerCase().includes(query))
    );
    if (statusFilter !== 'all') {
      filteredAgentsResult = filteredAgentsResult.filter(agent => agent.status === statusFilter);
    }
    setFilteredAgents(filteredAgentsResult);

    let filteredCompaniesResult = companies.filter(company => 
      company.name.toLowerCase().includes(query)
    );
    if (statusFilter !== 'all') {
      filteredCompaniesResult = filteredCompaniesResult.filter(company => company.status === statusFilter);
    }
    setFilteredCompanies(filteredCompaniesResult);

    const filteredAssignmentsResult = assignments.filter(assignment => 
      assignment.user_email.toLowerCase().includes(query) ||
      assignment.user_name.toLowerCase().includes(query) ||
      assignment.agent_name.toLowerCase().includes(query)
    );
    setFilteredAssignments(filteredAssignmentsResult);

    const filteredInvitationsResult = invitations.filter(invitation => 
      invitation.email.toLowerCase().includes(query) ||
      invitation.name.toLowerCase().includes(query) ||
      (invitation.company_name && invitation.company_name.toLowerCase().includes(query))
    );
    setFilteredInvitations(filteredInvitationsResult);
  };

  const exportData = () => {
    let csvContent = '';
    let filename = '';

    switch (activeTab) {
      case 'members':
        csvContent = [
          'Email,Name,Role,Status,Company,Total Calls,Total Spent,Current Balance,Assigned Agents,Created',
          ...filteredMembers.map(member => 
            `"${member.email}","${member.name}","${member.role}","${member.status}","${member.company_name || ''}","${member.total_calls}","${member.total_spent}","${member.current_balance}","${member.assigned_agents}","${new Date(member.created_at).toLocaleDateString()}"`
          )
        ].join('\n');
        filename = 'team_members';
        break;
      case 'agents':
        csvContent = [
          'Name,Retell ID,Company,Assigned Users,Total Calls,Status,Created',
          ...filteredAgents.map(agent => 
            `"${agent.name}","${agent.retell_agent_id}","${agent.company_name || ''}","${agent.assigned_users}","${agent.total_calls}","${agent.status}","${new Date(agent.created_at).toLocaleDateString()}"`
          )
        ].join('\n');
        filename = 'agents';
        break;
      case 'companies':
        csvContent = [
          'Name,Users Count,Agents Count,Total Calls,Total Spent,Status,Created',
          ...filteredCompanies.map(company => 
            `"${company.name}","${company.users_count}","${company.agents_count}","${company.total_calls}","${company.total_spent}","${company.status}","${new Date(company.created_at).toLocaleDateString()}"`
          )
        ].join('\n');
        filename = 'companies';
        break;
      case 'assignments':
        csvContent = [
          'User Email,User Name,Agent Name,Is Primary,Created',
          ...filteredAssignments.map(assignment => 
            `"${assignment.user_email}","${assignment.user_name}","${assignment.agent_name}","${assignment.is_primary ? 'Yes' : 'No'}","${new Date(assignment.created_at).toLocaleDateString()}"`
          )
        ].join('\n');
        filename = 'user_agent_assignments';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Datos exportados exitosamente');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  // TeamPage.tsx - PARTE 5: FUNCIONES DE MANEJO

  // ========================================
  // 🆕 FUNCIONES PARA MANEJAR AGENTES
  // ========================================

  // Cargar agentes de Retell para el modal
  const loadRetellAgentsForModal = async () => {
    setLoadingRetellAgents(true);
    try {
      const agents = await getAllRetellAgentsForTeam();
      setRetellAgents(agents);
    } catch (error) {
      console.error('Error loading Retell agents:', error);
      toast.error('Error al cargar agentes de Retell');
      setRetellAgents([]);
    } finally {
      setLoadingRetellAgents(false);
    }
  };

  // Función para agregar agente
  const handleAddAgent = async (agentData: { 
    retell_agent_id: string; 
    name: string; 
    company_id?: string; 
    description?: string;
  }) => {
    try {
      console.log('📝 Adding new agent:', agentData);

      // Verificar que el agente de Retell existe
      const exists = await verifyRetellAgentExists(agentData.retell_agent_id);
      if (!exists) {
        toast.error('❌ Agente no encontrado en Retell AI');
        return;
      }

      // Verificar que no esté ya agregado
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('retell_agent_id', agentData.retell_agent_id)
        .single();

      if (existingAgent) {
        toast.error('❌ Este agente ya está registrado');
        return;
      }

      // Insertar en la base de datos
      const { error: insertError } = await supabase
        .from('agents')
        .insert({
          name: agentData.name,
          retell_agent_id: agentData.retell_agent_id,
          company_id: agentData.company_id || null,
          description: agentData.description || null,
          status: 'active',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('✅ Agente agregado exitosamente');
      await fetchAgents();
      setAddAgentModal(false);

    } catch (error: any) {
      console.error('❌ Error adding agent:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Función para ver detalles del agente
  const handleViewAgent = async (agent: Agent) => {
    try {
      console.log('👁️ Viewing agent details:', agent.id);

      if (agent.retell_agent_id && !agent.retell_agent_id.includes('N/A')) {
        try {
          const retellAgent = await getRetellAgentDetailsForTeam(agent.retell_agent_id);
          
          setAgentDetailsModal({
            open: true,
            agent: agent,
            retellData: retellAgent
          });

        } catch (retellError) {
          console.error('Error fetching Retell data:', retellError);
          toast.info(`📊 ${agent.name}`, {
            description: `Estado: ${agent.status}\nRetell ID: ${agent.retell_agent_id}`,
            duration: 8000
          });
        }
      } else {
        toast.info(`📊 ${agent.name}`, {
          description: `Estado: ${agent.status}\n⚠️ Sin conexión a Retell AI`,
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error('❌ Error viewing agent:', error);
      toast.error(`Error al ver agente: ${error.message}`);
    }
  };

  // Función para editar agente
  const handleEditAgent = (agent: Agent) => {
    setEditAgentModal({
      open: true,
      agent: agent
    });
  };

  // Función para guardar cambios del agente
  const handleSaveAgentChanges = async (
    agentId: string, 
    updatedData: { 
      name: string; 
      company_id?: string; 
      description?: string; 
    }
  ) => {
    try {
      console.log('💾 Saving agent changes:', agentId, updatedData);

      const { error: updateError } = await supabase
        .from('agents')
        .update({
          name: updatedData.name,
          company_id: updatedData.company_id || null,
          description: updatedData.description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);

      if (updateError) {
        throw updateError;
      }

      toast.success('✅ Agente actualizado exitosamente');
      await fetchAgents();
      setEditAgentModal({ open: false });

    } catch (error: any) {
      console.error('❌ Error saving agent changes:', error);
      toast.error(`Error al actualizar agente: ${error.message}`);
    }
  };

  // ========================================
  // 🆕 FUNCIONES PARA MANEJAR ASIGNACIONES
  // ========================================

  const handleEditAssignment = (assignment: UserAgentAssignment) => {
    setEditAssignmentModal({
      open: true,
      assignment: assignment
    });
  };

  const handleDeleteAssignment = (assignment: UserAgentAssignment) => {
    setDeleteAssignmentModal({
      open: true,
      assignment: assignment
    });
  };

  const handleSaveAssignmentChanges = async (
    assignmentId: string,
    updatedData: {
      agent_id: string;
      is_primary: boolean;
    }
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('user_agent_assignments')
        .update({
          agent_id: updatedData.agent_id,
          is_primary: updatedData.is_primary,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) {
        throw updateError;
      }

      toast.success('✅ Asignación actualizada exitosamente');
      await fetchAssignments();
      setEditAssignmentModal({ open: false });

    } catch (error: any) {
      console.error('❌ Error updating assignment:', error);
      toast.error(`Error al actualizar asignación: ${error.message}`);
    }
  };

  const handleConfirmDeleteAssignment = async (assignmentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('user_agent_assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) {
        throw deleteError;
      }

      toast.success('✅ Asignación eliminada exitosamente');
      await fetchAssignments();
      setDeleteAssignmentModal({ open: false });

    } catch (error: any) {
      console.error('❌ Error deleting assignment:', error);
      toast.error(`Error al eliminar asignación: ${error.message}`);
    }
  };

  const handleCreateAssignment = async (assignmentData: {
    user_id: string;
    agent_id: string;
    is_primary: boolean;
  }) => {
    try {
      const { data: existingAssignment } = await supabase
        .from('user_agent_assignments')
        .select('id')
        .eq('user_id', assignmentData.user_id)
        .eq('agent_id', assignmentData.agent_id)
        .single();

      if (existingAssignment) {
        toast.error('❌ Esta asignación ya existe');
        return;
      }

      if (assignmentData.is_primary) {
        await supabase
          .from('user_agent_assignments')
          .update({ is_primary: false })
          .eq('user_id', assignmentData.user_id)
          .eq('is_primary', true);
      }

      const { error: insertError } = await supabase
        .from('user_agent_assignments')
        .insert({
          user_id: assignmentData.user_id,
          agent_id: assignmentData.agent_id,
          is_primary: assignmentData.is_primary,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('✅ Asignación creada exitosamente');
      await fetchAssignments();
      setAssignmentModal({ open: false });

    } catch (error: any) {
      console.error('❌ Error creating assignment:', error);
      toast.error(`Error al crear asignación: ${error.message}`);
    }
  };

  // ========================================
  // FUNCIONES EXISTENTES DE MIEMBROS (mantener como están)
  // ========================================

  const handlePasswordChanged = () => {
    toast.success('✅ Password updated successfully');
    fetchTeamMembers();
  };

  const handleSendInvitation = async (memberData: {
    email: string;
    name: string;
    company_id?: string;
    role: string;
  }) => {
    try {
      if (!isSuperAdmin) {
        toast.error('❌ Acceso denegado: Solo super administradores pueden enviar invitaciones');
        return;
      }

      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', memberData.email)
        .single();

      if (existingUser) {
        toast.error('❌ Ya existe un usuario registrado con ese email');
        return;
      }

      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id, status, created_at')
        .eq('email', memberData.email)
        .eq('status', 'pending')
        .single();

      if (existingInvitation) {
        const createdDate = new Date(existingInvitation.created_at).toLocaleDateString();
        toast.error(`❌ Ya hay una invitación pendiente para este email (enviada el ${createdDate})`);
        return;
      }

      const invitationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: invitation, error: invitationError } = await supabase
        .from('team_invitations')
        .insert({
          email: memberData.email,
          role: memberData.role,
          company_id: memberData.company_id || null,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          invited_by: user?.id,
          status: 'pending'
        })
        .select()
        .single();

      if (invitationError) {
        throw invitationError;
      }

      toast.loading('📧 Enviando invitación por email...', { id: 'sending-email' });
      
      try {
        await sendInvitationEmail({
          email: memberData.email,
          token: invitationToken,
          role: memberData.role,
          company_name: 'Dr. Scale AI',
          invited_by_email: user?.email
        });
        
        toast.success('✅ Invitación enviada exitosamente por email', {
          id: 'sending-email',
          description: `Invitación enviada a ${memberData.email}`,
          duration: 5000
        });
        
      } catch (emailError: any) {
        const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitationToken}`;
        
        toast.error('⚠️ Error enviando email - URL manual generada', {
          id: 'sending-email',
          duration: 10000
        });
        
        toast.info('🔗 URL de invitación (copiar manualmente)', {
          description: invitationUrl,
          duration: 15000
        });
      }

      await fetchAllData();
      setAddMemberModal(false);

    } catch (error: any) {
      console.error('❌ Error enviando invitación:', error);
      toast.error(`Error inesperado: ${error.message}`, { id: 'sending-email' });
    }
  };

  const handleEditMember = async (memberId: string, updatedData: {
    name: string;
    email: string;
    role: string;
  }) => {
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          name: updatedData.name,
          email: updatedData.email,
          role: updatedData.role
        })
        .eq('id', memberId);

      if (profileError) {
        throw profileError;
      }

      const { error: userError } = await supabase
        .from('users')
        .update({
          email: updatedData.email,
          name: updatedData.name
        })
        .eq('id', memberId);

      if (userError) {
        console.warn('Error updating public.users:', userError);
      }

      toast.success('✅ Usuario actualizado exitosamente');
      await fetchTeamMembers();
      setEditMemberModal({ open: false });

    } catch (error: any) {
      console.error('❌ Error editando miembro:', error);
      toast.error(`Error al editar usuario: ${error.message}`);
    }
  };

  const handleDeleteMember = async (memberId: string, memberEmail: string) => {
    try {
      if (SUPER_ADMIN_EMAILS.includes(memberEmail)) {
        toast.error('❌ No se puede eliminar a un super administrador');
        return;
      }

      toast.loading('🗑️ Eliminando usuario...', { id: 'deleting-user' });

      const deletePromises = [
        supabase.from('user_agent_assignments').delete().eq('user_id', memberId),
        supabase.from('calls').delete().eq('user_id', memberId),
        supabase.from('transactions').delete().eq('user_id', memberId),
        supabase.from('user_credits').delete().eq('user_id', memberId),
        supabase.from('user_profiles').delete().eq('id', memberId),
        supabase.from('users').delete().eq('id', memberId),
        supabase.auth.admin.deleteUser(memberId)
      ];

      await Promise.allSettled(deletePromises);
      await fetchTeamMembers();
      setDeleteMemberModal({ open: false });
      toast.success('✅ Usuario eliminado completamente', { id: 'deleting-user' });

    } catch (error: any) {
      console.error('❌ Error eliminando miembro:', error);
      toast.error(`Error al eliminar usuario: ${error.message}`, { id: 'deleting-user' });
    }
  };
  // TeamPage.tsx - PARTE 6A: JSX - HEADER Y STATS

  // ========================================
  // STATS Y VERIFICACIONES FINALES
  // ========================================

  const stats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.status === 'active').length,
    totalAssignments: assignments.length,
    primaryAssignments: assignments.filter(a => a.is_primary).length,
    totalInvitations: invitations.length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length
  };

  // Verificaciones de seguridad
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

  // ========================================
  // RENDER PRINCIPAL - HEADER Y STATS
  // ========================================

  return (
    <DashboardLayout>
      <div className="w-full space-y-4 sm:space-y-6">
        {/* Banner identificador */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <span className="text-blue-600 font-bold text-sm">👥</span>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Panel de Gestión de Equipos - Sistema de Invitaciones + Contraseñas</h3>
              <p className="text-sm text-blue-700">
                Sistema completo de gestión con invitaciones por email y cambio de contraseñas - Solo Super Admins
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              v3.2 - Con Gestión de Contraseñas
            </Badge>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 Gestión de Equipos</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Crown className="w-3 h-3 mr-1" />
              Super Admin
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="w-3 h-3 mr-1" />
              Datos en Tiempo Real
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <Key className="w-3 h-3 mr-1" />
              Password Management
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={fetchAllData} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Miembros del Equipo</p>
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
                  <p className="text-xs text-green-600">{stats.activeAgents} activos</p>
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
                  <p className="text-xs text-green-600">{stats.activeCompanies} activas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Invitaciones</p>
                  <p className="text-xl font-bold">{stats.totalInvitations}</p>
                  <p className="text-xs text-amber-600">{stats.pendingInvitations} pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        // TeamPage.tsx - PARTE 6B: JSX - TABS Y SECCIÓN DE AGENTES

        {/* Main Content with Tabs */}
        <Card className="border-0 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-gray-100/80 p-1 rounded-lg">
                  <TabsTrigger value="members" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Miembros</span>
                  </TabsTrigger>
                  <TabsTrigger value="invitations" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Invitaciones</span>
                  </TabsTrigger>
                  <TabsTrigger value="agents" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <span className="hidden sm:inline">Agentes</span>
                  </TabsTrigger>
                  <TabsTrigger value="companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Empresas</span>
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Asignaciones</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* 🆕 Tab: Agentes AI (ACTUALIZADO) */}
              <TabsContent value="agents" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Agentes AI ({filteredAgents.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchAgents} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button onClick={() => setAddAgentModal(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Agente
                    </Button>
                  </div>
                </div>

                {filteredAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron agentes</h3>
                    <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda o actualizar los datos.</p>
                    <Button onClick={fetchAgents} variant="outline" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar Agentes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium text-sm">{agent.name}</p>
                              <span className="text-xs text-gray-500">ID: {agent.retell_agent_id}</span>
                              
                              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                                <Bot className="h-3 w-3 mr-1" />
                                {agent.status}
                              </Badge>

                              {/* 🆕 BADGE PARA AGENTES NO SINCRONIZADOS */}
                              {agent.id.startsWith('retell-') && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  No sincronizado
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                              <span>Empresa: <strong>{agent.company_name || 'N/A'}</strong></span>
                              <span>Usuarios: <strong>{agent.assigned_users}</strong></span>
                              <span>Llamadas: <strong>{agent.total_calls}</strong></span>
                              <span>Creado: <strong>{formatDate(agent.created_at)}</strong></span>
                            </div>
                            
                            {/* 🆕 INFORMACIÓN ADICIONAL DE RETELL */}
                            {agent.voice_id && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-purple-600 mt-1">
                                <span>Voz: <strong>{agent.voice_id}</strong></span>
                                <span>Idioma: <strong>{agent.language || 'N/A'}</strong></span>
                                <span>LLM: <strong>{agent.llm_id || 'N/A'}</strong></span>
                              </div>
                            )}
                            
                            {agent.description && (
                              <p className="text-xs text-gray-500 mt-1">{agent.description}</p>
                            )}
                          </div>
                        </div>

                        {/* 🆕 BOTONES ACTUALIZADOS */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewAgent(agent)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* 🔄 BOTÓN ADICIONAL PARA SINCRONIZAR SI ES AGENTE NO SINCRONIZADO */}
                          {agent.id.startsWith('retell-') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                // Convertir agente de Retell a agente local
                                handleAddAgent({
                                  retell_agent_id: agent.retell_agent_id,
                                  name: agent.name,
                                  description: agent.description
                                });
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Sincronizar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              // TeamPage.tsx - PARTE 6C: JSX - SECCIÓN DE ASIGNACIONES

              {/* 🆕 Tab: Asignaciones Usuario-Agente (ACTUALIZADO) */}
              <TabsContent value="assignments" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Asignaciones Usuario-Agente ({filteredAssignments.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchAssignments} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button onClick={() => setAssignmentModal({ open: true })} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Asignación
                    </Button>
                  </div>
                </div>

                {filteredAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron asignaciones</h3>
                    <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda o actualizar los datos.</p>
                    <Button onClick={fetchAssignments} variant="outline" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar Asignaciones
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium text-sm">{assignment.user_email}</p>
                              <span className="text-xs text-gray-500">→</span>
                              <p className="font-medium text-sm text-purple-600">{assignment.agent_name}</p>
                              
                              {assignment.is_primary && (
                                <Badge variant="default">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Primaria
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-600">
                              <span>Usuario: <strong>{assignment.user_name}</strong></span>
                              <span>Tipo: <strong>{assignment.is_primary ? 'Primaria' : 'Secundaria'}</strong></span>
                              <span>Creado: <strong>{formatDate(assignment.created_at)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* 🆕 BOTONES ACTUALIZADOS PARA ASIGNACIONES */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditAssignment(assignment)}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteAssignment(assignment)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Miembros del Equipo (mantener como está) */}
              <TabsContent value="members" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Miembros del Equipo ({filteredMembers.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchTeamMembers} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!isSuperAdmin) {
                          toast.error('❌ Solo super administradores pueden invitar usuarios');
                          return;
                        }
                        setAddMemberModal(true);
                      }} 
                      size="sm"
                      disabled={!isSuperAdmin}
                      className={!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invitar Miembro
                    </Button>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron miembros</h3>
                    <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda o actualizar los datos.</p>
                    <Button onClick={fetchTeamMembers} variant="outline" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar Miembros
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
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
                              
                              {member.role === 'admin' && (
                                <Badge variant="destructive">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              
                              {member.role === 'super_admin' && (
                                <Badge variant="destructive">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Super Admin
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-gray-600">
                              <span>Empresa: <strong>{member.company_name || 'N/A'}</strong></span>
                              <span>Balance: <strong className="text-green-600">{formatCurrency(member.current_balance)}</strong></span>
                              <span>Gastado: <strong className="text-red-600">{formatCurrency(member.total_spent)}</strong></span>
                              <span>Llamadas: <strong>{member.total_calls}</strong></span>
                              <span>Agentes: <strong>{member.assigned_agents}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPasswordModal({
                              open: true,
                              member: member
                            })}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Change Password"
                          >
                            <Key className="h-4 w-4 mr-1" />
                            Password
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAssignmentModal({
                              open: true,
                              userId: member.id,
                              userName: member.name
                            })}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Asignar
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditMemberModal({
                              open: true,
                              member: member
                            })}
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setDeleteMemberModal({
                              open: true,
                              member: member
                            })}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              // TeamPage.tsx - PARTE 6D: JSX - TABS RESTANTES (INVITACIONES Y EMPRESAS)

              {/* Tab: Invitaciones Enviadas */}
              <TabsContent value="invitations" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Invitaciones Enviadas ({filteredInvitations.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchInvitations} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                  </div>
                </div>

                {filteredInvitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay invitaciones enviadas</h3>
                    <p className="text-gray-600 mb-4">Las invitaciones que envíes aparecerán aquí.</p>
                    <Button onClick={() => setAddMemberModal(true)} size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Enviar Primera Invitación
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium text-sm">{invitation.email}</p>
                              <span className="text-xs text-gray-500">({invitation.name})</span>
                              
                              <Badge variant={
                                invitation.status === 'pending' ? 'secondary' :
                                invitation.status === 'accepted' ? 'default' :
                                invitation.status === 'expired' ? 'destructive' : 'outline'
                              }>
                                {invitation.status === 'pending' && <Calendar className="h-3 w-3 mr-1" />}
                                {invitation.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {invitation.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                                {invitation.status}
                              </Badge>
                              
                              <Badge variant="outline">
                                {invitation.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                                {invitation.role === 'super_admin' && <Shield className="h-3 w-3 mr-1" />}
                                {invitation.role === 'user' && <User className="h-3 w-3 mr-1" />}
                                {invitation.role}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                              <span>Empresa: <strong>{invitation.company_name || 'N/A'}</strong></span>
                              <span>Invitado por: <strong>{invitation.invited_by_email}</strong></span>
                              <span>Enviado: <strong>{formatDate(invitation.created_at)}</strong></span>
                              <span>Expira: <strong>{formatDate(invitation.expires_at)}</strong></span>
                            </div>
                            
                            {invitation.accepted_at && (
                              <p className="text-xs text-green-600 mt-1">
                                ✅ Aceptado el {formatDate(invitation.accepted_at)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
                              navigator.clipboard.writeText(invitationUrl);
                              toast.success('URL de invitación copiada al portapapeles');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Copiar URL
                          </Button>
                          
                          {invitation.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                toast.info('Funcionalidad de cancelar invitación en desarrollo');
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          )}
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
                  <div className="flex gap-2">
                    <Button onClick={fetchCompanies} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button onClick={() => setAddCompanyModal(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Empresa
                    </Button>
                  </div>
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron empresas</h3>
                    <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda o actualizar los datos.</p>
                    <Button onClick={fetchCompanies} variant="outline" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar Empresas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium text-sm">{company.name}</p>
                              
                              <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                                <Building2 className="h-3 w-3 mr-1" />
                                {company.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-gray-600">
                              <span>Usuarios: <strong>{company.users_count}</strong></span>
                              <span>Agentes: <strong>{company.agents_count}</strong></span>
                              <span>Llamadas: <strong>{company.total_calls}</strong></span>
                              <span>Gastado: <strong className="text-red-600">{formatCurrency(company.total_spent)}</strong></span>
                              <span>Creado: <strong>{formatDate(company.created_at)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          
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
        // TeamPage.tsx - PARTE 7: JSX - MODALES COMPLETOS

        {/* ========================================
            MODALES EXISTENTES (mantener como están)
            ======================================== */}
        
        {/* 🔑 Modal de gestión de contraseñas */}
        {passwordModal.open && passwordModal.member && (
          <AdminPasswordManager
            targetUserId={passwordModal.member.id}
            targetUserEmail={passwordModal.member.email}
            targetUserName={passwordModal.member.name}
            onPasswordChanged={handlePasswordChanged}
            onClose={() => setPasswordModal({ open: false })}
          />
        )}

        {/* Modal Editar Miembro */}
        {editMemberModal.open && editMemberModal.member && (
          <EditMemberModal
            member={editMemberModal.member}
            onClose={() => setEditMemberModal({ open: false })}
            onSave={handleEditMember}
          />
        )}

        {/* Modal Eliminar Miembro */}
        {deleteMemberModal.open && deleteMemberModal.member && (
          <DeleteMemberModal
            member={deleteMemberModal.member}
            onClose={() => setDeleteMemberModal({ open: false })}
            onConfirm={handleDeleteMember}
          />
        )}

        {/* Modal Invitar Miembro */}
        {addMemberModal && (
          <AddMemberModal
            onClose={() => setAddMemberModal(false)}
            onSave={handleSendInvitation}
            companies={companies}
            currentUser={user}
          />
        )}

        {/* ========================================
            🆕 NUEVOS MODALES PARA AGENTES
            ======================================== */}

        {/* 🆕 Modal para agregar agente */}
        {addAgentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  Agregar Nuevo Agente
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Selecciona un agente de Retell AI para añadir a tu equipo
                </p>
              </CardHeader>
              <CardContent>
                <AddAgentForm 
                  onClose={() => setAddAgentModal(false)}
                  onSave={handleAddAgent}
                  companies={companies}
                  retellAgents={retellAgents}
                  loadingRetellAgents={loadingRetellAgents}
                  onLoadRetellAgents={loadRetellAgentsForModal}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 🆕 Modal para ver detalles del agente */}
        {agentDetailsModal.open && agentDetailsModal.agent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-[600px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  Detalles del Agente
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Información completa del agente y datos de Retell AI
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* INFORMACIÓN BÁSICA */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Información Básica
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><strong>Nombre:</strong> {agentDetailsModal.agent.name}</div>
                    <div><strong>Estado:</strong> 
                      <Badge className="ml-2" variant={agentDetailsModal.agent.status === 'active' ? 'default' : 'secondary'}>
                        {agentDetailsModal.agent.status}
                      </Badge>
                    </div>
                    <div><strong>Empresa:</strong> {agentDetailsModal.agent.company_name || 'N/A'}</div>
                    <div><strong>Usuarios asignados:</strong> {agentDetailsModal.agent.assigned_users}</div>
                    <div><strong>Total llamadas:</strong> {agentDetailsModal.agent.total_calls}</div>
                    <div><strong>Creado:</strong> {formatDate(agentDetailsModal.agent.created_at)}</div>
                  </div>
                  {agentDetailsModal.agent.description && (
                    <div className="mt-3">
                      <strong>Descripción:</strong> 
                      <p className="text-gray-600 mt-1">{agentDetailsModal.agent.description}</p>
                    </div>
                  )}
                </div>

                {/* INFORMACIÓN DE RETELL */}
                {agentDetailsModal.retellData ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4 text-purple-600" />
                      Datos de Retell AI
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><strong>Agent ID:</strong> 
                        <code className="ml-1 bg-white px-2 py-1 rounded text-xs">
                          {agentDetailsModal.retellData.agent_id}
                        </code>
                      </div>
                      <div><strong>Voz:</strong> {agentDetailsModal.retellData.voice_id}</div>
                      <div><strong>Idioma:</strong> {agentDetailsModal.retellData.language}</div>
                      <div><strong>Motor:</strong> {agentDetailsModal.retellData.response_engine?.type || 'N/A'}</div>
                      <div><strong>LLM:</strong> {agentDetailsModal.retellData.response_engine?.llm_id || 'N/A'}</div>
                      <div><strong>Última modificación:</strong> 
                        {new Date(agentDetailsModal.retellData.last_modification_time).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        No se pudieron obtener datos actualizados de Retell AI
                      </span>
                    </div>
                  </div>
                )}

                {/* BOTONES */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setAgentDetailsModal({ open: false })}
                  >
                    Cerrar
                  </Button>
                  <Button 
                    onClick={() => {
                      setAgentDetailsModal({ open: false });
                      setEditAgentModal({ open: true, agent: agentDetailsModal.agent });
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Editar Agente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 🆕 Modal para editar agente */}
        {editAgentModal.open && editAgentModal.agent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-full mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-500" />
                  Editar Agente
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  ID: {editAgentModal.agent.retell_agent_id}
                </p>
              </CardHeader>
              <CardContent>
                <EditAgentForm 
                  agent={editAgentModal.agent}
                  onClose={() => setEditAgentModal({ open: false })}
                  onSave={handleSaveAgentChanges}
                  companies={companies}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================
            🆕 NUEVOS MODALES PARA ASIGNACIONES
            ======================================== */}

        {/* 🆕 Modal para editar asignación */}
        {editAssignmentModal.open && editAssignmentModal.assignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-full mx-4">
              <CardHeader>
                <CardTitle>Editar Asignación</CardTitle>
              </CardHeader>
              <CardContent>
                <EditAssignmentForm 
                  assignment={editAssignmentModal.assignment}
                  onClose={() => setEditAssignmentModal({ open: false })}
                  onSave={handleSaveAssignmentChanges}
                  agents={agents}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 🆕 Modal para eliminar asignación */}
        {deleteAssignmentModal.open && deleteAssignmentModal.assignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-full mx-4">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar Eliminación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ¿Estás seguro de eliminar la asignación de <strong>{deleteAssignmentModal.assignment.user_name}</strong> al agente <strong>{deleteAssignmentModal.assignment.agent_name}</strong>?
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Esta acción no se puede deshacer.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDeleteAssignmentModal({ open: false })}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => handleConfirmDeleteAssignment(deleteAssignmentModal.assignment!.id)}
                      variant="destructive"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================
            MODALES PLACEHOLDER (mantener como están)
            ======================================== */}

        {/* Modal Agregar Empresa */}
        {addCompanyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Agregar Nueva Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="Nombre de la empresa" />
                  <Input placeholder="Descripción (opcional)" />
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setAddCompanyModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    toast.success('Funcionalidad en desarrollo');
                    setAddCompanyModal(false);
                  }}>
                    Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal Asignaciones */}
        {assignmentModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>
                  {assignmentModal.userId ? 
                    `Asignar Agente a ${assignmentModal.userName}` : 
                    'Nueva Asignación Usuario-Agente'
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!assignmentModal.userId && (
                    <select className="w-full border rounded px-3 py-2">
                      <option value="">Seleccionar usuario</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.email} ({member.name})
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <select className="w-full border rounded px-3 py-2">
                    <option value="">Seleccionar agente</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.retell_agent_id})
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="primary" />
                    <label htmlFor="primary" className="text-sm">
                      Asignación primaria
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setAssignmentModal({ open: false })}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    toast.success('Funcionalidad en desarrollo');
                    setAssignmentModal({ open: false });
                  }}>
                    Asignar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
