// TeamPage.tsx - PARTE 1: IMPORTS E INTERFACES COMPLETAS - ✅ CORREGIDO

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Activity,
  Shield,
  Mail,
  Calendar,
  Building2,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Key,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { sendInvitationEmail } from '@/services/send-invitation/email';

// ✅ Imports corregidos para Retell API con funciones seguras
import { 
  getAllRetellAgentsForTeam, 
  getRetellAgentDetailsForTeam, 
  verifyRetellAgentExists,
  clearAgentsCache,
  formatAgentForDisplay,
  safeFormatDate,
  safeFormatDateTime,
  RetellAgentDetailed 
} from '@/services/agentService';

// ✅ NUEVO IMPORT AGREGADO PARA ASIGNACIONES
import { 
  fetchUserAgentAssignments, 
  createUserAgentAssignment, 
  removeUserAgentAssignment,
  updateUserAgentAssignmentPrimary,
  UserAgentAssignment 
} from '@/services/agent/userAgentAssignmentQueries';

// ========================================
// INTERFACES Y TIPOS - ✅ ACTUALIZADAS
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
  
  // ✅ Campos adicionales del CSV
  avatar_url?: string;
  rate_per_minute?: number;
  updated_at?: string;
  
  // ✅ Campos enriquecidos de Retell
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
// TeamPage.tsx - PARTE 2: COMPONENTE PRINCIPAL Y ESTADOS - ✅ CORREGIDO

export default function TeamPage() {
  const { user } = useAuth();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState('registered-users'); // ✅ CAMBIADO DE 'members' A 'registered-users'
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
  const [registeredUsers, setRegisteredUsers] = useState<TeamMember[]>([]);
  const [filteredRegisteredUsers, setFilteredRegisteredUsers] = useState<TeamMember[]>([]);
  
  // Estados de modales básicos
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [addAgentModal, setAddAgentModal] = useState(false);
  const [addCompanyModal, setAddCompanyModal] = useState(false);
  
  // Estados de modales para miembros
  const [editMemberModal, setEditMemberModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });
  const [deleteMemberModal, setDeleteMemberModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });

  // Estados para agentes con manejo mejorado de errores
  const [retellAgents, setRetellAgents] = useState<RetellAgentDetailed[]>([]);
  const [loadingRetellAgents, setLoadingRetellAgents] = useState(false);
  const [retellError, setRetellError] = useState<string | null>(null);
  const [lastRetellUpdate, setLastRetellUpdate] = useState<Date | null>(null);
  const [agentDetailsModal, setAgentDetailsModal] = useState<{
    open: boolean;
    agent?: Agent;
    retellData?: RetellAgentDetailed;
  }>({ open: false });
  const [editAgentModal, setEditAgentModal] = useState<{
    open: boolean;
    agent?: Agent;
  }>({ open: false });

  // Estados para asignaciones
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    userId?: string;
    userName?: string;
  }>({ open: false });
  const [editAssignmentModal, setEditAssignmentModal] = useState<{
    open: boolean;
    assignment?: UserAgentAssignment;
  }>({ open: false });
  const [deleteAssignmentModal, setDeleteAssignmentModal] = useState<{
    open: boolean;
    assignment?: UserAgentAssignment;
  }>({ open: false });

  // Verificación de super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  // ✅ useEffect principal
  useEffect(() => {
    if (user && isSuperAdmin) {
      console.log('🚀 [TeamPage] Inicializando página de gestión de equipos...');
      fetchAllData();
      
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
  }, [teamMembers, agents, companies, assignments, invitations, registeredUsers, searchQuery, statusFilter, activeTab]);
  // TeamPage.tsx - PARTE 3: FUNCIONES AUXILIARES MEJORADAS

  // ========================================
  // ✅ FUNCIONES AUXILIARES MEJORADAS
  // ========================================

  // ✅ Función de formateo de fecha segura
  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      return safeFormatDate(dateString);
    } catch (error) {
      console.warn('⚠️ Error formateando fecha:', dateString, error);
      return 'Fecha inválida';
    }
  }, []);

  // ✅ Función de formateo de moneda
  const formatCurrency = useCallback((amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount || 0);
    } catch (error) {
      return '$0.00';
    }
  }, []);

  // ✅ Función mejorada para aplicar filtros
  const applyFilters = useCallback(() => {
    try {
      const query = searchQuery.toLowerCase();

      // Filtrar miembros
      let filteredMembersResult = teamMembers.filter(member => 
        (member.email?.toLowerCase() || '').includes(query) ||
        (member.name?.toLowerCase() || '').includes(query) ||
        (member.company_name?.toLowerCase() || '').includes(query)
      );
      if (statusFilter !== 'all') {
        filteredMembersResult = filteredMembersResult.filter(member => member.status === statusFilter);
      }
      setFilteredMembers(filteredMembersResult);

      // Filtrar agentes
      let filteredAgentsResult = agents.filter(agent => 
        (agent.name?.toLowerCase() || '').includes(query) ||
        (agent.retell_agent_id?.toLowerCase() || '').includes(query) ||
        (agent.company_name?.toLowerCase() || '').includes(query)
      );
      if (statusFilter !== 'all') {
        filteredAgentsResult = filteredAgentsResult.filter(agent => agent.status === statusFilter);
      }
      setFilteredAgents(filteredAgentsResult);

      // Filtrar empresas
      let filteredCompaniesResult = companies.filter(company => 
        (company.name?.toLowerCase() || '').includes(query)
      );
      if (statusFilter !== 'all') {
        filteredCompaniesResult = filteredCompaniesResult.filter(company => company.status === statusFilter);
      }
      setFilteredCompanies(filteredCompaniesResult);

      // Filtrar asignaciones
      const filteredAssignmentsResult = assignments.filter(assignment => 
        (assignment.user_email?.toLowerCase() || '').includes(query) ||
        (assignment.user_name?.toLowerCase() || '').includes(query) ||
        (assignment.agent_name?.toLowerCase() || '').includes(query)
      );
      setFilteredAssignments(filteredAssignmentsResult);

      // Filtrar invitaciones
      const filteredInvitationsResult = invitations.filter(invitation => 
        (invitation.email?.toLowerCase() || '').includes(query) ||
        (invitation.name?.toLowerCase() || '').includes(query) ||
        (invitation.company_name?.toLowerCase() || '').includes(query)
      );
      setFilteredInvitations(filteredInvitationsResult);

      // Filtrar usuarios registrados
      let filteredRegisteredUsersResult = registeredUsers.filter(user => 
        (user.email?.toLowerCase() || '').includes(query) ||
        (user.name?.toLowerCase() || '').includes(query) ||
        (user.company_name?.toLowerCase() || '').includes(query)
      );
      if (statusFilter !== 'all') {
        filteredRegisteredUsersResult = filteredRegisteredUsersResult.filter(user => user.status === statusFilter);
      }
      setFilteredRegisteredUsers(filteredRegisteredUsersResult);
    } catch (error) {
      console.error('❌ Error aplicando filtros:', error);
    }
  }, [teamMembers, agents, companies, assignments, invitations, registeredUsers, searchQuery, statusFilter]);

  // ✅ Función para exportar datos
  const exportData = useCallback(() => {
    try {
      let csvContent = '';
      let filename = '';

      switch (activeTab) {
        case 'registered-users':
          csvContent = [
            'Email,Name,Role,Status,Company,Total Calls,Total Spent,Current Balance,Assigned Agents,Created',
            ...filteredRegisteredUsers.map(user => 
              `"${user.email || ''}","${user.name || ''}","${user.role || ''}","${user.status || ''}","${user.company_name || ''}","${user.total_calls || 0}","${user.total_spent || 0}","${user.current_balance || 0}","${user.assigned_agents || 0}","${formatDate(user.created_at)}"`
            )
          ].join('\n');
          filename = 'registered_users';
          break;
        case 'agents':
          csvContent = [
            'Name,Retell ID,Company,Assigned Users,Total Calls,Status,Created',
            ...filteredAgents.map(agent => 
              `"${agent.name || ''}","${agent.retell_agent_id || ''}","${agent.company_name || ''}","${agent.assigned_users || 0}","${agent.total_calls || 0}","${agent.status || ''}","${formatDate(agent.created_at)}"`
            )
          ].join('\n');
          filename = 'agents';
          break;
        case 'companies':
          csvContent = [
            'Name,Users Count,Agents Count,Total Calls,Total Spent,Status,Created',
            ...filteredCompanies.map(company => 
              `"${company.name || ''}","${company.users_count || 0}","${company.agents_count || 0}","${company.total_calls || 0}","${company.total_spent || 0}","${company.status || ''}","${formatDate(company.created_at)}"`
            )
          ].join('\n');
          filename = 'companies';
          break;
        case 'assignments':
          csvContent = [
            'User Email,User Name,Agent Name,Is Primary,Created',
            ...filteredAssignments.map(assignment => 
              `"${assignment.user_email || ''}","${assignment.user_name || ''}","${assignment.agent_name || ''}","${assignment.is_primary ? 'Yes' : 'No'}","${formatDate(assignment.created_at)}"`
            )
          ].join('\n');
          filename = 'user_agent_assignments';
          break;
        default:
          throw new Error('Pestaña no válida para exportar');
      }

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('✅ Datos exportados exitosamente');
    } catch (error: any) {
      console.error('❌ Error exportando datos:', error);
      toast.error(`Error al exportar: ${error.message}`);
    }
  }, [activeTab, filteredRegisteredUsers, filteredAgents, filteredCompanies, filteredAssignments, formatDate]);
  // TeamPage.tsx - PARTE 4: FUNCIONES FETCH

  // ========================================
  // ✅ FUNCIÓN FETCHALLDATA CORREGIDA
  // ========================================

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setRetellError(null);
    
    try {
      console.log('🔄 [TeamPage] Cargando todos los datos...');
      
      // Primero cargar usuarios
      await Promise.all([
        fetchTeamMembers(),
        fetchAllRegisteredUsers()
      ]);

      // Después cargar todo lo demás incluyendo asignaciones
      await Promise.all([
        fetchAgents(),
        fetchCompanies(),
        fetchInvitations(),
        fetchAssignments()
      ]);
      
      console.log('✅ [TeamPage] Todos los datos cargados exitosamente');
      
    } catch (error: any) {
      console.error('❌ [TeamPage] Error cargando datos:', error);
      toast.error(`Error al cargar datos del equipo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // ✅ FUNCIÓN FETCHASSIGNMENTS CORREGIDA
  // ========================================

  const fetchAssignments = useCallback(async () => {
    try {
      console.log('🔍 [TeamPage] Fetching user-agent assignments...');
      
      // ✅ USAR LA FUNCIÓN DEL SERVICE QUE YA FUNCIONA
      const assignmentsData = await fetchUserAgentAssignments();
      
      // ✅ AHORA SÍ DEBERÍAN ESTAR DISPONIBLES teamMembers y registeredUsers
      const formattedAssignments: UserAgentAssignment[] = assignmentsData.map(assignment => {
        let userEmail = `usuario-${assignment.user_id.slice(0, 8)}@unknown.com`;
        let userName = `Usuario ${assignment.user_id.slice(0, 8)}`;
        
        // Buscar en teamMembers primero
        const teamMember = teamMembers.find(member => member.id === assignment.user_id);
        if (teamMember) {
          userEmail = teamMember.email;
          userName = teamMember.name || teamMember.email;
        }
        // Si no está en teamMembers, buscar en registeredUsers
        else {
          const registeredUser = registeredUsers.find(user => user.id === assignment.user_id);
          if (registeredUser) {
            userEmail = registeredUser.email;
            userName = registeredUser.name || registeredUser.email;
          }
        }
        
        return {
          id: assignment.id,
          user_id: assignment.user_id,
          agent_id: assignment.agent_id,
          user_email: userEmail,
          user_name: userName,
          agent_name: assignment.agent_details?.name || 'Agente',
          is_primary: assignment.is_primary || false,
          created_at: assignment.assigned_at || new Date().toISOString()
        };
      });

      setAssignments(formattedAssignments);
      console.log('✅ [TeamPage] Assignments loaded successfully:', formattedAssignments.length);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error fetching assignments:', error);
      setAssignments([]);
      toast.error(`Error al cargar asignaciones: ${error.message}`);
    }
  }, [teamMembers, registeredUsers]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      console.log('🔍 [TeamPage] Fetching team members...');
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        throw usersError;
      }

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
      console.log('✅ [TeamPage] Team members loaded successfully:', sortedMembers.length);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error fetching team members:', error);
      toast.error(`Error al cargar miembros: ${error.message}`);
    }
  }, []);

  const fetchAllRegisteredUsers = useCallback(async () => {
    try {
      console.log('🔍 [TeamPage] Fetching ALL registered users...');
      
      // Obtener TODOS los usuarios de la tabla auth.users a través de user_profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');

      if (usersError) {
        console.error('❌ Error fetching all users:', usersError);
        throw usersError;
      }

      if (!usersData || usersData.length === 0) {
        console.log('⚠️ No registered users found');
        setRegisteredUsers([]);
        return;
      }

      // Obtener datos adicionales
      const [creditsResult, callsResult, companyMembersResult] = await Promise.all([
        supabase.from('user_credits').select('user_id, current_balance'),
        supabase.from('calls').select('user_id, cost_usd'),
        supabase.from('company_members').select(`
          user_id,
          company_id,
          role,
          created_at,
          companies:company_id (
            id,
            name
          )
        `)
      ]);

      const creditsData = creditsResult.data || [];
      const callsData = callsResult.data || [];
      const companyMembers = companyMembersResult.data || [];

      const allUsers: TeamMember[] = usersData.map(user => {
        const credit = creditsData.find(c => c.user_id === user.id);
        const userCalls = callsData.filter(c => c.user_id === user.id);
        const companyMember = companyMembers.find(cm => cm.user_id === user.id);

        const totalSpent = userCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const currentBalance = credit?.current_balance || 0;

        return {
          id: user.id,
          email: user.email || `user-${user.id.slice(0, 8)}`,
          name: user.name || user.full_name || user.email || 'Usuario',
          role: companyMember?.role || user.role || 'user',
          status: currentBalance > 0 ? 'active' : 'inactive',
          company_id: companyMember?.company_id || user.company_id,
          company_name: companyMember?.companies?.name || null,
          created_at: user.created_at || new Date().toISOString(),
          last_login: user.last_sign_in_at,
          total_calls: userCalls.length,
          total_spent: totalSpent,
          current_balance: currentBalance,
          assigned_agents: 0
        };
      });

      const sortedUsers = allUsers.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setRegisteredUsers(sortedUsers);
      console.log('✅ [TeamPage] ALL registered users loaded:', sortedUsers.length);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error fetching all registered users:', error);
      toast.error(`Error al cargar usuarios registrados: ${error.message}`);
    }
  }, []);
  // TeamPage.tsx - PARTE 5: MÁS FUNCIONES FETCH

  const fetchCompanies = useCallback(async () => {
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
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      console.log('🔍 [TeamPage] Fetching invitations...');
      
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .order('created_at', { ascending: false });

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

      setInvitations(combinedInvitations);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error fetching invitations:', error);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      console.log('🔍 [TeamPage] Fetching Custom AI Agents from database...');
      
      const { data: customAgents, error: customError } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (customError) {
        console.error('❌ Error fetching custom agents:', customError);
        throw customError;
      }

      if (!customAgents || customAgents.length === 0) {
        console.log('⚠️ No custom agents found');
        setAgents([]);
        return;
      }

      // Obtener información adicional de Retell para enriquecer los datos
      let retellAgents: RetellAgentDetailed[] = [];
      try {
        console.log('🔍 [TeamPage] Obteniendo datos de Retell para enriquecer información...');
        retellAgents = await getAllRetellAgentsForTeam();
        setRetellAgents(retellAgents);
        setLastRetellUpdate(new Date());
        setRetellError(null);
        console.log('✅ [TeamPage] Retell data fetched for enrichment:', retellAgents.length);
      } catch (retellError: any) {
        console.error('⚠️ [TeamPage] Error fetching Retell data for enrichment:', retellError);
        setRetellError('No se pudieron cargar datos de Retell AI para enriquecimiento');
      }

      // Procesar SOLO los Custom Agents
      const processedCustomAgents: Agent[] = customAgents.map(customAgent => {
        try {
          const retellData = retellAgents.find(r => r.agent_id === customAgent.retell_agent_id);
          
          return {
            id: customAgent.id,
            name: customAgent.name || 'Custom Agent Sin Nombre',
            retell_agent_id: customAgent.retell_agent_id || 'No asignado',
            company_id: customAgent.company_id,
            company_name: null,
            assigned_users: 0,
            total_calls: 0,
            status: customAgent.status || 'active',
            created_at: customAgent.created_at || new Date().toISOString(),
            description: customAgent.description || (retellData ? `Voz: ${retellData.voice_id}` : 'Sin descripción'),
            voice_id: retellData?.voice_id || 'No disponible',
            language: retellData?.language || 'No disponible',
            retell_agent_name: retellData?.agent_name || `Agent ${customAgent.retell_agent_id?.slice(0, 8)}` || 'Sin nombre',
            llm_id: retellData?.response_engine?.llm_id || 'No disponible',
            last_modification_time: retellData?.last_modification_time,
            avatar_url: customAgent.avatar_url,
            rate_per_minute: customAgent.rate_per_minute
          };
        } catch (agentError) {
          console.warn('⚠️ [TeamPage] Error procesando custom agent:', customAgent.id, agentError);
          return {
            id: customAgent.id,
            name: customAgent.name || 'Custom Agent con Error',
            retell_agent_id: customAgent.retell_agent_id || 'Error',
            company_id: customAgent.company_id,
            company_name: null,
            assigned_users: 0,
            total_calls: 0,
            status: 'inactive',
            created_at: customAgent.created_at || new Date().toISOString(),
            description: 'Error al procesar datos del agente',
            avatar_url: customAgent.avatar_url,
            rate_per_minute: customAgent.rate_per_minute
          };
        }
      });

      const sortedCustomAgents = processedCustomAgents.sort((a, b) => {
        try {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          
          if (isNaN(dateA) && isNaN(dateB)) return 0;
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          
          return dateB - dateA;
        } catch (sortError) {
          console.warn('⚠️ Error ordenando custom agents:', sortError);
          return 0;
        }
      });

      setAgents(sortedCustomAgents);
      console.log(`✅ [TeamPage] Custom Agents loaded successfully: ${sortedCustomAgents.length} agents`);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error fetching custom agents:', error);
      toast.error(`Error al cargar Custom Agents: ${error.message}`);
      setAgents([]);
    }
  }, []);
  // TeamPage.tsx - PARTE 6: HANDLERS DE ASIGNACIONES

  // ========================================
  // ✅ HANDLERS DE ASIGNACIONES CORREGIDOS
  // ========================================

  const handleCreateAssignment = useCallback(async (assignmentData: {
    user_id: string;
    agent_id: string;
    is_primary: boolean;
  }) => {
    try {
      console.log('📝 [TeamPage] Creating new assignment:', assignmentData);

      // ✅ Verificar si ya existe la asignación
      const existingAssignment = assignments.find(
        a => a.user_id === assignmentData.user_id && a.agent_id === assignmentData.agent_id
      );
      
      if (existingAssignment) {
        toast.error('❌ Ya existe una asignación entre este usuario y agente');
        return;
      }

      // ✅ USAR LA FUNCIÓN DEL SERVICE
      await createUserAgentAssignment(
        assignmentData.user_id, 
        assignmentData.agent_id, 
        assignmentData.is_primary
      );
      
      toast.success('✅ Asignación creada exitosamente');
      await fetchAssignments(); // Recargar datos
      setAssignmentModal({ open: false });

    } catch (error: any) {
      console.error('❌ [TeamPage] Error creating assignment:', error);
      toast.error(`Error al crear asignación: ${error.message}`);
    }
  }, [assignments, fetchAssignments]);

  const handleUpdatePrimary = useCallback(async (
    assignmentId: string,
    isPrimary: boolean,
    userId: string
  ) => {
    try {
      console.log('🔄 [TeamPage] Updating primary assignment:', { assignmentId, isPrimary, userId });

      await updateUserAgentAssignmentPrimary(assignmentId, isPrimary, userId);
      
      toast.success(isPrimary ? '✅ Marcado como agente primario' : '✅ Desmarcado como agente primario');
      await fetchAssignments(); // Recargar datos

    } catch (error: any) {
      console.error('❌ [TeamPage] Error updating primary assignment:', error);
      toast.error(`Error al actualizar asignación: ${error.message}`);
    }
  }, [fetchAssignments]);

  const handleRemoveAssignment = useCallback(async (assignmentId: string) => {
    try {
      console.log('🗑️ [TeamPage] Removing assignment:', assignmentId);

      await removeUserAgentAssignment(assignmentId);
      
      toast.success('✅ Asignación eliminada exitosamente');
      await fetchAssignments(); // Recargar datos

    } catch (error: any) {
      console.error('❌ [TeamPage] Error removing assignment:', error);
      toast.error(`Error al eliminar asignación: ${error.message}`);
    }
  }, [fetchAssignments]);

  // ========================================
  // ✅ HANDLERS DE AGENTES
  // ========================================

  const loadRetellAgentsForModal = useCallback(async () => {
    setLoadingRetellAgents(true);
    setRetellError(null);
    
    try {
      console.log('🔍 [TeamPage] Cargando agentes de Retell para modal...');
      
      const apiKey = import.meta.env.VITE_RETELL_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_RETELL_API_KEY no está configurada en el archivo .env');
      }
      
      clearAgentsCache();
      
      const agents = await getAllRetellAgentsForTeam();
      setRetellAgents(agents);
      setLastRetellUpdate(new Date());
      
      console.log('✅ [TeamPage] Agentes de Retell cargados para modal:', agents.length);
      
      if (agents.length === 0) {
        toast.info('ℹ️ No se encontraron agentes en Retell AI');
      } else {
        toast.success(`✅ ${agents.length} agentes cargados de Retell AI`);
      }
      
    } catch (error: any) {
      console.error('❌ [TeamPage] Error cargando agentes de Retell para modal:', error);
      
      let errorMessage = 'Error al cargar agentes de Retell';
      
      if (error.message.includes('Invalid time value')) {
        errorMessage = 'Error de formato de fecha en agentes de Retell';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Error de autenticación con Retell AI. Verifica tu API key.';
      } else if (error.message.includes('VITE_RETELL_API_KEY')) {
        errorMessage = 'API key de Retell no configurada. Revisa tu archivo .env';
      }
      
      setRetellError(errorMessage);
      toast.error(`❌ ${errorMessage}`);
      setRetellAgents([]);
    } finally {
      setLoadingRetellAgents(false);
    }
  }, []);

  const handleAddAgent = useCallback(async (agentData: { 
    retell_agent_id: string; 
    name: string; 
    company_id?: string; 
    description?: string;
    rate_per_minute?: number;
  }) => {
    try {
      console.log('📝 [TeamPage] Adding new Custom AI Agent:', agentData);

      const exists = await verifyRetellAgentExists(agentData.retell_agent_id);
      if (!exists) {
        toast.error('❌ Agente de Retell AI no encontrado');
        return;
      }

      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id, name')
        .eq('retell_agent_id', agentData.retell_agent_id)
        .single();

      if (existingAgent) {
        toast.error(`❌ Ya existe un Custom Agent "${existingAgent.name}" asignado a este agente de Retell`);
        return;
      }

      const { error: insertError } = await supabase
        .from('agents')
        .insert({
          name: agentData.name,
          retell_agent_id: agentData.retell_agent_id,
          company_id: agentData.company_id || null,
          description: agentData.description || null,
          rate_per_minute: agentData.rate_per_minute || null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('✅ Custom AI Agent creado exitosamente');
      await fetchAgents();
      setAddAgentModal(false);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error adding Custom Agent:', error);
      toast.error(`Error al crear Custom Agent: ${error.message}`);
    }
  }, [fetchAgents]);

  const handleViewAgent = useCallback(async (agent: Agent) => {
    try {
      console.log('👁️ [TeamPage] Viewing agent details:', agent.id);

      if (agent.retell_agent_id && agent.retell_agent_id !== 'No asignado') {
        try {
          toast.loading('Cargando detalles del agente...', { id: 'loading-agent' });
          
          const retellAgent = await getRetellAgentDetailsForTeam(agent.retell_agent_id);
          
          setAgentDetailsModal({
            open: true,
            agent: agent,
            retellData: retellAgent
          });
          
          toast.dismiss('loading-agent');

        } catch (retellError: any) {
          console.error('⚠️ [TeamPage] Error fetching Retell data:', retellError);
          toast.dismiss('loading-agent');
          
          setAgentDetailsModal({
            open: true,
            agent: agent,
            retellData: undefined
          });
          
          if (retellError.message.includes('Invalid time value')) {
            toast.warning('⚠️ Error de formato de fecha en datos de Retell');
          } else {
            toast.warning('⚠️ No se pudieron cargar datos actualizados de Retell AI');
          }
        }
      } else {
        setAgentDetailsModal({
          open: true,
          agent: agent,
          retellData: undefined
        });
      }

    } catch (error: any) {
      console.error('❌ [TeamPage] Error viewing agent:', error);
      toast.error(`Error al ver agente: ${error.message}`);
    }
  }, []);

  const handleEditAgent = useCallback((agent: Agent) => {
    setEditAgentModal({
      open: true,
      agent: agent
    });
  }, []);

  const handleSaveAgentChanges = useCallback(async (
    agentId: string, 
    updatedData: { 
      name: string; 
      company_id?: string; 
      description?: string; 
      rate_per_minute?: number;
    }
  ) => {
    try {
      console.log('💾 [TeamPage] Saving agent changes:', agentId, updatedData);

      const { error: updateError } = await supabase
        .from('agents')
        .update({
          name: updatedData.name,
          company_id: updatedData.company_id || null,
          description: updatedData.description || null,
          rate_per_minute: updatedData.rate_per_minute || null,
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
      console.error('❌ [TeamPage] Error saving agent changes:', error);
      toast.error(`Error al actualizar agente: ${error.message}`);
    }
  }, [fetchAgents]);

  const handlePasswordChanged = useCallback(() => {
    toast.success('✅ Password updated successfully');
    fetchTeamMembers();
  }, [fetchTeamMembers]);
  // TeamPage.tsx - PARTE 7: HANDLERS DE INVITACIONES Y ESTADÍSTICAS

  const handleSendInvitation = useCallback(async (memberData: {
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

      const { error: invitationError } = await supabase
        .from('team_invitations')
        .insert({
          email: memberData.email,
          role: memberData.role,
          company_id: memberData.company_id || null,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          invited_by: user?.id,
          status: 'pending'
        });

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
      console.error('❌ [TeamPage] Error enviando invitación:', error);
      toast.error(`Error inesperado: ${error.message}`, { id: 'sending-email' });
    }
  }, [isSuperAdmin, user?.id, user?.email, fetchAllData]);

  // ========================================
  // ✅ ESTADÍSTICAS
  // ========================================

  const stats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
    totalRegistered: registeredUsers.length,
    activeRegistered: registeredUsers.filter(u => u.status === 'active').length,
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalCompanies: companies.length,
    activeCompanies: companies.filter(c => c.status === 'active').length,
    totalAssignments: assignments.length,
    primaryAssignments: assignments.filter(a => a.is_primary).length,
    totalInvitations: invitations.length,
    pendingInvitations: invitations.filter(i => i.status === 'pending').length
  };

  // ========================================
  // VERIFICACIONES Y GUARDS
  // ========================================

  // Verificación de usuario autenticado
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

  // Verificación de permisos de super admin
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

  // Estado de carga
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
  // TeamPage.tsx - PARTE 8: JSX PRINCIPAL CON PESTAÑAS CORREGIDAS

  // ========================================
  // JSX PRINCIPAL - RENDER DEL COMPONENTE
  // ========================================

  return (
    <DashboardLayout>
      <div className="w-full space-y-4 sm:space-y-6">
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
            <Button variant="outline" size="sm" onClick={() => console.log('Botón configurar')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </div>
        </div>

        {/* ✅ Error de Retell API (si existe) */}
        {retellError && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>⚠️ Advertencia:</strong> {retellError}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-3"
                onClick={() => {
                  setRetellError(null);
                  loadRetellAgentsForModal();
                }}
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Main Content with Tabs */}
        <Card className="border-0 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <TabsList className="grid w-full max-w-2xl grid-cols-5 bg-gray-100/80 p-1 rounded-lg">
                  <TabsTrigger value="registered-users" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Usuarios</span>
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

            <CardContent>cyan-50 to-cyan-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-cyan-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                  <p className="text-xl font-bold">{stats.totalRegistered}</p>
                  <p className="text-xs text-green-600">{stats.activeRegistered} activos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Custom AI Agents</p>
                  <p className="text-xl font-bold">{stats.totalAgents}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-green-600">{stats.activeAgents} activos</p>
                    {lastRetellUpdate && (
                      <p className="text-xs text-gray-500">
                        ({lastRetellUpdate.toLocaleTimeString()})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-
            // TeamPage.tsx - PARTE 9: TABSCONTENT - USUARIOS REGISTRADOS

              {/* Tab: Usuarios Registrados */}
              <TabsContent value="registered-users" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Usuarios ({filteredRegisteredUsers.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchAllRegisteredUsers} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => console.log('Botón configurar registrados')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-cyan-600 mt-0.5" />
                    <div className="text-sm text-cyan-800">
                      <strong>Usuarios:</strong> Aquí aparecen TODOS los usuarios que se han registrado en la plataforma.
                    </div>
                  </div>
                </div>

                {filteredRegisteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron usuarios registrados</h3>
                    <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRegisteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-sm">{user.email}</p>
                            <span className="text-xs text-gray-500">({user.name})</span>
                            
                            <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                              {user.status === 'active' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {user.status}
                            </Badge>
                            
                            {user.role === 'admin' && (
                              <Badge variant="destructive">
                                <Crown className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}

                            {/* Indicador de origen del registro */}
                            {teamMembers.find(m => m.id === user.id) ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Mail className="h-3 w-3 mr-1" />
                                Por Invitación
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <User className="h-3 w-3 mr-1" />
                                Registro Directo
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs text-gray-600">
                            <span>Empresa: <strong>{user.company_name || 'N/A'}</strong></span>
                            <span>Balance: <strong className="text-green-600">{formatCurrency(user.current_balance)}</strong></span>
                            <span>Gastado: <strong className="text-red-600">{formatCurrency(user.total_spent)}</strong></span>
                            <span>Llamadas: <strong>{user.total_calls}</strong></span>
                            <span>Agentes: <strong>{user.assigned_agents}</strong></span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-500 mt-1">
                            <span>Registrado: <strong>{formatDate(user.created_at)}</strong></span>
                            <span>Último acceso: <strong>{user.last_login ? formatDate(user.last_login) : 'Nunca'}</strong></span>
                            <span>ID: <code className="bg-gray-100 px-1 rounded text-xs">{user.id.slice(0, 8)}...</code></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setActiveTab('assignments');
                              setSearchQuery(user.email);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Ver Asignaciones
                          </Button>
                          
                          {!teamMembers.find(m => m.id === user.id) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => {
                                console.log('Agregar usuario a gestión de equipo:', user.email);
                                toast.info('Funcionalidad de agregar a equipo en desarrollo');
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Agregar a Equipo
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
          // TeamPage.tsx - PARTE 10: TABSCONTENT - INVITACIONES Y AGENTES

              {/* Tab: Invitaciones */}
              <TabsContent value="invitations" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Invitaciones Enviadas ({filteredInvitations.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchInvitations} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button 
                      onClick={() => setAddMemberModal(true)} 
                      size="sm"
                      disabled={!isSuperAdmin}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Nueva Invitación
                    </Button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Invitaciones:</strong> Aquí puedes ver todas las invitaciones enviadas a nuevos miembros del equipo.
                      Las invitaciones pendientes expiran en 7 días.
                    </div>
                  </div>
                </div>

                {filteredInvitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay invitaciones</h3>
                    <p className="text-gray-600 mb-4">Aún no se han enviado invitaciones a nuevos miembros.</p>
                    <Button 
                      onClick={() => setAddMemberModal(true)}
                      disabled={!isSuperAdmin}
                    >
                      <Mail className="w-4 h-4 mr-2" />
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
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-sm">{invitation.email}</p>
                            <span className="text-xs text-gray-500">({invitation.name})</span>
                            
                            <Badge variant={
                              invitation.status === 'pending' ? 'default' : 
                              invitation.status === 'accepted' ? 'secondary' :
                              invitation.status === 'expired' ? 'destructive' : 'outline'
                            }>
                              {invitation.status === 'pending' && (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {invitation.status === 'accepted' && (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              {invitation.status === 'expired' && (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {invitation.status === 'pending' ? 'Pendiente' : 
                               invitation.status === 'accepted' ? 'Aceptada' :
                               invitation.status === 'expired' ? 'Expirada' : invitation.status}
                            </Badge>
                            
                            {invitation.role === 'admin' && (
                              <Badge variant="destructive">
                                <Crown className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                            <span>Rol: <strong>{invitation.role}</strong></span>
                            <span>Empresa: <strong>{invitation.company_name || 'N/A'}</strong></span>
                            <span>Enviada: <strong>{formatDate(invitation.created_at)}</strong></span>
                            <span>Expira: <strong>{formatDate(invitation.expires_at)}</strong></span>
                          </div>
                          
                          {invitation.accepted_at && (
                            <div className="text-xs text-green-600 mt-1">
                              ✅ Aceptada el {formatDate(invitation.accepted_at)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {invitation.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
                                navigator.clipboard.writeText(invitationUrl);
                                toast.success('🔗 URL de invitación copiada al portapapeles');
                              }}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Copiar URL
                            </Button>
                          )}
                          
                          {invitation.status === 'accepted' && invitation.user_id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setActiveTab('registered-users');
                                setSearchQuery(invitation.email);
                              }}
                            >
                              <User className="h-4 w-4 mr-1" />
                              Ver Usuario
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Custom AI Agents */}
              <TabsContent value="agents" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Custom AI Agents ({filteredAgents.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchAgents} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button 
                      onClick={() => {
                        setAddAgentModal(true);
                        // Cargar agentes de Retell si no están cargados o están obsoletos
                        if (retellAgents.length === 0 || retellError || !lastRetellUpdate || 
                            (new Date().getTime() - lastRetellUpdate.getTime()) > 300000) { // 5 minutos
                          loadRetellAgentsForModal();
                        }
                      }} 
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Custom Agent
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Bot className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Custom AI Agents:</strong> Estos son tus agentes personalizados. Cada uno tiene asignado un agente de Retell AI como motor de voz.
                      {retellError && (
                        <div className="text-orange-700 mt-1">
                          ⚠️ {retellError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {filteredAgents.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay Custom AI Agents</h3>
                    <p className="text-gray-600 mb-4">Crea tu primer Custom Agent y asígnale un agente de Retell AI.</p>
                    <Button onClick={() => {
                      setAddAgentModal(true);
                      if (retellAgents.length === 0) {
                        loadRetellAgentsForModal();
                      }
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primer Custom Agent
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
                          {agent.avatar_url && (
                            <img 
                              src={agent.avatar_url} 
                              alt={agent.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium text-sm">{agent.name}</p>
                              <span className="text-xs text-gray-500">Custom Agent</span>
                              
                              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                                <Bot className="h-3 w-3 mr-1" />
                                {agent.status}
                              </Badge>

                              {agent.retell_agent_id && agent.retell_agent_id !== 'No asignado' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Retell Conectado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Sin Retell
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                              <span>Empresa: <strong>{agent.company_name || 'N/A'}</strong></span>
                              <span>Usuarios: <strong>{agent.assigned_users}</strong></span>
                              <span>Llamadas: <strong>{agent.total_calls}</strong></span>
                              <span>Tarifa: <strong>{agent.rate_per_minute ? `${agent.rate_per_minute}/min` : 'N/A'}</strong></span>
                            </div>
                            
                            {agent.voice_id && agent.voice_id !== 'No disponible' && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-purple-600 mt-1">
                                <span>Voz: <strong>{agent.voice_id}</strong></span>
                                <span>Idioma: <strong>{agent.language || 'N/A'}</strong></span>
                                <span>LLM: <strong>{agent.llm_id || 'N/A'}</strong></span>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-1">
                              <span>Agente Retell: <strong className="text-purple-700">{agent.retell_agent_name || agent.retell_agent_id}</strong></span>
                            </div>
                            
                            {agent.description && (
                              <p className="text-xs text-gray-500 mt-1">{agent.description}</p>
                            )}
                          </div>
                        </div>

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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
