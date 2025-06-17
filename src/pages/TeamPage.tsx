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
  }, [teamMembers, agents, companies, assignments, invitations, searchQuery, statusFilter, activeTab]);

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
        case 'members':
          csvContent = [
            'Email,Name,Role,Status,Company,Total Calls,Total Spent,Current Balance,Assigned Agents,Created',
            ...filteredMembers.map(member => 
              `"${member.email || ''}","${member.name || ''}","${member.role || ''}","${member.status || ''}","${member.company_name || ''}","${member.total_calls || 0}","${member.total_spent || 0}","${member.current_balance || 0}","${member.assigned_agents || 0}","${formatDate(member.created_at)}"`
            )
          ].join('\n');
          filename = 'team_members';
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
  }, [activeTab, filteredMembers, filteredAgents, filteredCompanies, filteredAssignments, formatDate]);
  // ========================================
  // ✅ FUNCIÓN FETCHALLDATA CORREGIDA
  // ========================================

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setRetellError(null);
    
    try {
      console.log('🔄 [TeamPage] Cargando todos los datos...');
      
      await Promise.all([
        fetchTeamMembers(),
        fetchAgents(),
        fetchCompanies(),
        fetchAssignments(), // ✅ AGREGADO
        fetchInvitations(),
        fetchAllRegisteredUsers()
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
      
      // ✅ CONVERTIR AL FORMATO QUE ESPERA TU CÓDIGO ORIGINAL - CORRIGIENDO EMAIL
      const formattedAssignments: UserAgentAssignment[] = assignmentsData.map(assignment => {
        // 🔧 CORREGIR EL MAPEO DEL EMAIL Y NOMBRE
        let userEmail = 'usuario@example.com';
        let userName = 'Usuario';
        
        // Primero intentar obtener el email del user_details
        if (assignment.user_details?.email) {
          userEmail = assignment.user_details.email;
        }
        
        // Luego intentar obtener el nombre, con fallback al email
        if (assignment.user_details?.full_name) {
          userName = assignment.user_details.full_name;
        } else if (assignment.user_details?.email) {
          userName = assignment.user_details.email;
        }
        
        // Si no hay user_details, buscar en teamMembers
        if (!assignment.user_details?.email) {
          const teamMember = teamMembers.find(member => member.id === assignment.user_id);
          if (teamMember) {
            userEmail = teamMember.email;
            userName = teamMember.name || teamMember.email;
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
      console.log('🔍 [DEBUG] Formatted assignments:', formattedAssignments);

    } catch (error: any) {
      console.error('❌ [TeamPage] Error fetching assignments:', error);
      setAssignments([]);
      toast.error(`Error al cargar asignaciones: ${error.message}`);
    }
  }, [teamMembers]);

  // ========================================
  // ✅ FUNCIÓN FETCHAGENTS ORIGINAL (mantener igual)
  // ========================================

  const fetchAgents = useCallback(async () => {
    try {
      console.log('🔍 [TeamPage] Fetching Custom AI Agents from database...');
      
      // ✅ SOLO obtener Custom Agents de la base de datos local
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

      // ✅ Obtener información adicional de Retell para enriquecer los datos
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

      // ✅ Procesar SOLO los Custom Agents
      const processedCustomAgents: Agent[] = customAgents.map(customAgent => {
        try {
          // Buscar datos de Retell correspondientes para enriquecer información
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
            
            // ✅ Datos enriquecidos de Retell (si están disponibles)
            voice_id: retellData?.voice_id || 'No disponible',
            language: retellData?.language || 'No disponible',
            llm_id: retellData?.response_engine?.llm_id || 'No disponible',
            last_modification_time: retellData?.last_modification_time,
            
            // ✅ Campos adicionales del CSV
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

      // ✅ Ordenar por fecha de creación
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

  // ========================================
  // ✅ FUNCIONES FETCH RESTANTES (mantener originales)
  // ========================================

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
  // ✅ HANDLERS DE AGENTES (mantener originales)
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

          <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-cyan-100/50">
  <CardContent className="p-4">
    <div className="flex items-center space-x-2">
      <User className="h-4 w-4 text-cyan-500" />
      <div>
        <p className="text-xs text-muted-foreground">Usuarios Registrados</p>
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
                <TabsList className="grid w-full max-w-2xl grid-cols-6 bg-gray-100/80 p-1 rounded-lg">
                  <TabsTrigger value="members" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Miembros</span>
                  </TabsTrigger>
                  <TabsTrigger value="registered-users" className="flex items-center gap-2">
  <User className="h-4 w-4" />
  <span className="hidden sm:inline">Registrados</span>
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
              {/* Tab: Miembros del Equipo */}
              <TabsContent value="members" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Miembros del Equipo ({filteredMembers.length})</h3>
                  <div className="flex gap-2">
                    <Button onClick={fetchTeamMembers} variant="outline" size="sm" disabled={loading}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => console.log('Botón configurar miembros')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar
                    </Button>
                    <Button 
                      onClick={() => setAddMemberModal(true)} 
                      size="sm"
                      disabled={!isSuperAdmin}
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
                    <p className="text-gray-600 mb-4">Intenta ajustar los filtros de búsqueda.</p>
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
                            
                            {member.role === 'admin' && (
                              <Badge variant="destructive">
                                <Crown className="h-3 w-3 mr-1" />
                                Admin
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
                    ))}
                  </div>
                )}
              </TabsContent>
              {/* Tab: Usuarios Registrados */}
              <TabsContent value="registered-users" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Usuarios Registrados ({filteredRegisteredUsers.length})</h3>
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
                      <strong>Usuarios Registrados:</strong> Aquí aparecen TODOS los usuarios que se han registrado en la plataforma, 
                      incluyendo aquellos que se registraron directamente sin invitación.
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
                              <span>Retell ID: <code className="bg-gray-100 px-1 rounded">{agent.retell_agent_id}</code></span>
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
                                setActiveTab('members');
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
              {/* ✅ Tab: Asignaciones - CORREGIDO */}
              <TabsContent value="assignments" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Asignaciones Usuario-Agente ({filteredAssignments.length})</h3>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        console.log('🔄 [TeamPage] Manual refresh of assignments...');
                        fetchAssignments();
                      }} 
                      variant="outline" 
                      size="sm" 
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Actualizar
                    </Button>
                    <Button 
                      onClick={() => {
                        console.log('➕ [TeamPage] Opening new assignment modal...');
                        setAssignmentModal({ open: true });
                      }} 
                      size="sm"
                      disabled={!isSuperAdmin || teamMembers.length === 0 || agents.length === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Asignación
                    </Button>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Settings className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <strong>Asignaciones:</strong> Gestiona qué usuarios tienen acceso a qué Custom AI Agents. 
                      Las asignaciones primarias indican el agente principal del usuario.
                    </div>
                  </div>
                </div>

                {filteredAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay asignaciones</h3>
                    <p className="text-gray-600 mb-4">
                      Aún no se han asignado Custom AI Agents a los usuarios.
                    </p>
                    {teamMembers.length > 0 && agents.length > 0 ? (
                      <Button 
                        onClick={() => {
                          console.log('➕ [TeamPage] Opening first assignment...');
                          setAssignmentModal({ open: true });
                        }}
                        disabled={!isSuperAdmin}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Primera Asignación
                      </Button>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {teamMembers.length === 0 && 'Necesitas tener miembros en el equipo '}
                        {agents.length === 0 && 'Necesitas tener Custom AI Agents '}
                        para crear asignaciones.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-500" />
                              <p className="font-medium text-sm">{assignment.user_name}</p>
                              <span className="text-xs text-gray-500">({assignment.user_email})</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">→</span>
                              <Bot className="h-4 w-4 text-purple-500" />
                              <p className="font-medium text-sm text-purple-700">{assignment.agent_name}</p>
                            </div>
                            
                            {assignment.is_primary && (
                              <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                <Crown className="h-3 w-3 mr-1" />
                                Primario
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-600">
                            <span>Tipo: <strong>{assignment.is_primary ? 'Asignación Primaria' : 'Asignación Secundaria'}</strong></span>
                            <span>Creada: <strong>{formatDate(assignment.created_at)}</strong></span>
                            <span>Estado: <strong className="text-green-600">Activa</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdatePrimary(
                              assignment.id, 
                              !assignment.is_primary, 
                              assignment.user_id
                            )}
                            className="text-blue-600 hover:text-blue-700"
                            disabled={!isSuperAdmin}
                          >
                            {assignment.is_primary ? 'Quitar Primario' : 'Hacer Primario'}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            disabled={!isSuperAdmin}
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

              {/* Tabs placeholder para otros contenidos */}
              <TabsContent value="companies" className="space-y-4 mt-0">
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gestión de Empresas</h3>
                  <p className="text-gray-600">Funcionalidad en desarrollo...</p>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        {/* ========================================
            MODALES
            ======================================== */}
        
        {/* Modal Invitar Miembro */}
        {addMemberModal && (
          <AddMemberModal
            onClose={() => setAddMemberModal(false)}
            onSave={handleSendInvitation}
            companies={companies}
            currentUser={user}
          />
        )}

        {/* Modal Agregar Agente */}
        {addAgentModal && (
          <AddAgentModal
            onClose={() => setAddAgentModal(false)}
            onSave={handleAddAgent}
            companies={companies}
            retellAgents={retellAgents}
            loadingRetellAgents={loadingRetellAgents}
            onLoadRetellAgents={loadRetellAgentsForModal}
            retellError={retellError}
          />
        )}

        {/* ✅ Modal Nueva Asignación - CORREGIDO */}
        {assignmentModal.open && (
          <NewAssignmentModal
            onClose={() => setAssignmentModal({ open: false })}
            onSave={handleCreateAssignment}
            users={teamMembers.filter(m => m.status === 'active')}
            agents={agents.filter(a => a.status === 'active')}
          />
        )}

        {/* Modal para ver detalles del agente */}
        {agentDetailsModal.open && agentDetailsModal.agent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-[600px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  Detalles del Agente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Información Básica</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><strong>Nombre:</strong> {agentDetailsModal.agent.name}</div>
                    <div><strong>Estado:</strong> 
                      <Badge className="ml-2" variant={agentDetailsModal.agent.status === 'active' ? 'default' : 'secondary'}>
                        {agentDetailsModal.agent.status}
                      </Badge>
                    </div>
                    <div><strong>Empresa:</strong> {agentDetailsModal.agent.company_name || 'N/A'}</div>
                    <div><strong>Creado:</strong> {formatDate(agentDetailsModal.agent.created_at)}</div>
                  </div>
                  {agentDetailsModal.agent.description && (
                    <div className="mt-3">
                      <strong>Descripción:</strong> 
                      <p className="text-gray-600 mt-1">{agentDetailsModal.agent.description}</p>
                    </div>
                  )}
                </div>

                {agentDetailsModal.retellData ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Datos de Retell AI</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><strong>Agente Retell:</strong> 
                        <span className="ml-1 font-medium text-purple-700">
                          {agentDetailsModal.retellData.agent_name || `Agent ${agentDetailsModal.retellData.agent_id.slice(0, 8)}`}
                        </span>
                      </div>
                      <div><strong>Voz:</strong> {agentDetailsModal.retellData.voice_id}</div>
                      <div><strong>Idioma:</strong> {agentDetailsModal.retellData.language}</div>
                      <div><strong>Motor:</strong> {agentDetailsModal.retellData.response_engine?.type || 'N/A'}</div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="text-xs text-gray-500">
                        <strong>ID Técnico:</strong> 
                        <code className="ml-1 bg-white px-2 py-1 rounded text-xs">
                          {agentDetailsModal.retellData.agent_id}
                        </code>
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

        {/* Modal para editar agente */}
        {editAgentModal.open && editAgentModal.agent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-full mx-4">
              <CardHeader>
                <CardTitle>Editar Agente</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  handleSaveAgentChanges(editAgentModal.agent!.id, {
                    name: formData.get('name') as string,
                    company_id: formData.get('company_id') as string || undefined,
                    description: formData.get('description') as string || undefined
                  });
                }} className="space-y-4">
                  <Input
                    name="name"
                    placeholder="Nombre del agente"
                    defaultValue={editAgentModal.agent.name}
                    required
                  />
                  <select
                    name="company_id"
                    defaultValue={editAgentModal.agent.company_id || ''}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Sin empresa</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  <Input
                    name="description"
                    placeholder="Descripción (opcional)"
                    defaultValue={editAgentModal.agent.description || ''}
                  />
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setEditAgentModal({ open: false })}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Guardar Cambios
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// ========================================
// COMPONENTES DE MODALES SIMPLES
// ========================================

interface AddMemberModalProps {
  onClose: () => void;
  onSave: (data: { email: string; name: string; role: string; company_id?: string }) => void;
  companies: Company[];
  currentUser: any;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onSave, companies }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'user',
    company_id: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      email: formData.email,
      name: formData.name,
      role: formData.role,
      company_id: formData.company_id || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 max-w-full mx-4">
        <CardHeader>
          <CardTitle>Invitar Nuevo Miembro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Sin empresa</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Enviar Invitación
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ MODAL PARA NUEVA ASIGNACIÓN - SIMPLIFICADO
interface NewAssignmentModalProps {
  onClose: () => void;
  onSave: (data: { user_id: string; agent_id: string; is_primary: boolean }) => void;
  users: TeamMember[];
  agents: Agent[];
}

const NewAssignmentModal: React.FC<NewAssignmentModalProps> = ({ 
  onClose, 
  onSave, 
  users, 
  agents 
}) => {
  const [formData, setFormData] = useState({
    user_id: '',
    agent_id: '',
    is_primary: false
  });

  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.agent_id) {
      toast.error('Por favor selecciona un usuario y un agente');
      return;
    }

    onSave({
      user_id: formData.user_id,
      agent_id: formData.agent_id,
      is_primary: formData.is_primary
    });
  };

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    setSelectedUser(user || null);
    setFormData(prev => ({ ...prev, user_id: userId }));
  };

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    setSelectedAgent(agent || null);
    setFormData(prev => ({ ...prev, agent_id: agentId }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-[500px] max-w-full mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            Nueva Asignación Usuario-Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Seleccionar Usuario */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario *</label>
              <select
                value={formData.user_id}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Selecciona un usuario</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Información del usuario seleccionado */}
            {selectedUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Usuario Seleccionado</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <div><strong>Nombre:</strong> {selectedUser.name}</div>
                  <div><strong>Email:</strong> {selectedUser.email}</div>
                  <div><strong>Empresa:</strong> {selectedUser.company_name || 'N/A'}</div>
                  <div><strong>Estado:</strong> {selectedUser.status}</div>
                </div>
              </div>
            )}

            {/* Seleccionar Agente */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom AI Agent *</label>
              <select
                value={formData.agent_id}
                onChange={(e) => handleAgentChange(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Selecciona un agente</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.company_name ? `(${agent.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Información del agente seleccionado */}
            {selectedAgent && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Agente Seleccionado</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                  <div><strong>Nombre:</strong> {selectedAgent.name}</div>
                  <div><strong>Estado:</strong> {selectedAgent.status}</div>
                  <div><strong>Empresa:</strong> {selectedAgent.company_name || 'N/A'}</div>
                  <div><strong>Retell ID:</strong> {selectedAgent.retell_agent_id}</div>
                </div>
              </div>
            )}

            {/* Checkbox para asignación primaria */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_primary: checked as boolean }))
                }
              />
              <label htmlFor="is_primary" className="text-sm font-medium">
                Asignación Primaria
              </label>
            </div>
            
            {formData.is_primary && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-xs text-yellow-800">
                  <strong>Nota:</strong> Una asignación primaria indica que este será el agente principal del usuario.
                  Solo puede haber una asignación primaria por usuario.
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!formData.user_id || !formData.agent_id}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Asignación
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ MODAL ADDAGENT - FUNCIONAL
interface AddAgentModalProps {
  onClose: () => void;
  onSave: (data: { retell_agent_id: string; name: string; company_id?: string; description?: string }) => void;
  companies: Company[];
  retellAgents: RetellAgentDetailed[];
  loadingRetellAgents: boolean;
  onLoadRetellAgents: () => void;
  retellError: string | null;
}

const AddAgentModal: React.FC<AddAgentModalProps> = ({ 
  onClose, 
  onSave, 
  companies, 
  retellAgents, 
  loadingRetellAgents, 
  onLoadRetellAgents,
  retellError 
}) => {
  const [formData, setFormData] = useState({
    retell_agent_id: '',
    name: '',
    company_id: '',
    description: ''
  });

  const [selectedRetellAgent, setSelectedRetellAgent] = useState<RetellAgentDetailed | null>(null);

  useEffect(() => {
    if (retellAgents.length === 0 && !loadingRetellAgents && !retellError) {
      onLoadRetellAgents();
    }
  }, []);

  useEffect(() => {
    if (selectedRetellAgent && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: selectedRetellAgent.agent_name || `Agent ${selectedRetellAgent.agent_id.slice(0, 8)}`,
        description: `Agente con voz ${selectedRetellAgent.voice_id} (${selectedRetellAgent.language})`
      }));
    }
  }, [selectedRetellAgent]);

  const handleRetellAgentChange = (agentId: string) => {
    const agent = retellAgents.find(a => a.agent_id === agentId);
    setSelectedRetellAgent(agent || null);
    setFormData(prev => ({
      ...prev,
      retell_agent_id: agentId
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.retell_agent_id) {
      toast.error('Por favor selecciona un agente de Retell AI');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Por favor ingresa un nombre para el Custom Agent');
      return;
    }

    onSave({
      retell_agent_id: formData.retell_agent_id,
      name: formData.name.trim(),
      company_id: formData.company_id || undefined,
      description: formData.description.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-[500px] max-w-full mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            Crear Custom AI Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Sección de Agentes de Retell */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Agente de Retell AI *</label>
              
              {retellError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-800 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{retellError}</span>
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={onLoadRetellAgents}
                    disabled={loadingRetellAgents}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingRetellAgents ? 'animate-spin' : ''}`} />
                    Reintentar cargar agentes
                  </Button>
                </div>
              ) : loadingRetellAgents ? (
                <div className="flex items-center gap-2 text-gray-600 text-sm p-3 bg-blue-50 rounded-lg">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Cargando agentes de Retell AI...</span>
                </div>
              ) : retellAgents.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-yellow-800 text-sm">
                    No se encontraron agentes de Retell AI disponibles.
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={onLoadRetellAgents}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Cargar agentes
                  </Button>
                </div>
              ) : (
                <select
                  value={formData.retell_agent_id}
                  onChange={(e) => handleRetellAgentChange(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Selecciona un agente de Retell AI</option>
                  {retellAgents.map(agent => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.agent_name || `Agent ${agent.agent_id.slice(0, 8)}`} - {agent.voice_id} ({agent.language})
                    </option>
                  ))}
                </select>
              )}
              
              {!loadingRetellAgents && (
                <div className="text-xs text-gray-500">
                  Total de agentes disponibles: {retellAgents.length}
                </div>
              )}
            </div>

            {/* Información del agente seleccionado */}
            {selectedRetellAgent && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Agente Seleccionado</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                  <div><strong>Nombre:</strong> {selectedRetellAgent.agent_name || 'Sin nombre'}</div>
                  <div><strong>Voz:</strong> {selectedRetellAgent.voice_id}</div>
                  <div><strong>Idioma:</strong> {selectedRetellAgent.language}</div>
                  <div><strong>Motor:</strong> {selectedRetellAgent.response_engine?.type || 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Nombre del Custom Agent */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Custom Agent *</label>
              <Input
                placeholder="Ej: Asistente de Ventas Solar"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            {/* Empresa */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa (opcional)</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Sin empresa asignada</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción (opcional)</label>
              <Input
                placeholder="Descripción del agente y su función"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!formData.retell_agent_id || !formData.name.trim() || loadingRetellAgents}
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Custom Agent
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ========================================
// EXPORT DEL COMPONENTE
// ========================================
