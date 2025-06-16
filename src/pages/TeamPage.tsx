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
  Key
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { sendInvitationEmail } from '@/services/send-invitation/email';
import { AdminPasswordManager } from '@/components/admin/AdminPasswordManager';
import { AddAgentForm, EditAgentForm, EditAssignmentForm } from '@/components/forms/AgentForms';

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

// ========================================
// INTERFACES Y TIPOS - ✅ SIN CAMBIOS NECESARIOS
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
  
  // Estados de modales
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

  // ✅ Estados para agentes con manejo mejorado de errores
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

  // ✅ useEffect principal con manejo mejorado
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

    } catch (error) {
      console.error('❌ Error aplicando filtros:', error);
    }
  }, [teamMembers, agents, companies, assignments, invitations, searchQuery, statusFilter]);

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
  // TeamPage.tsx - PARTE 3: FUNCIONES FETCH PRINCIPALES - ✅ CORREGIDO

// ========================================
// ✅ FUNCIÓN FETCHALLLDATA MEJORADA
// ========================================

const fetchAllData = useCallback(async () => {
  setLoading(true);
  setRetellError(null);
  
  try {
    console.log('🔄 [TeamPage] Cargando todos los datos...');
    
    await Promise.all([
      fetchTeamMembers(),
      fetchAgents(), // ✅ Esta función ahora está corregida
      fetchCompanies(),
      fetchAssignments(),
      fetchInvitations()
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
// ✅ FUNCIÓN FETCHAGENTS CORREGIDA - SOLO CUSTOM AGENTS
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
      setRetellAgents(retellAgents); // Para usar en el formulario de agregar
      setLastRetellUpdate(new Date());
      setRetellError(null);
      console.log('✅ [TeamPage] Retell data fetched for enrichment:', retellAgents.length);
    } catch (retellError: any) {
      console.error('⚠️ [TeamPage] Error fetching Retell data for enrichment:', retellError);
      setRetellError('No se pudieron cargar datos de Retell AI para enriquecimiento');
      // Continuar sin datos de Retell
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
          company_name: null, // Se puede agregar join con companies después
          assigned_users: 0, // Se puede calcular después con user_agent_assignments
          total_calls: 0, // Se puede calcular después con calls table
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
        // Devolver agente con datos mínimos si hay error
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
        // Prioridad: agentes activos primero
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        
        // Luego por fecha de creación
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

    // ✅ Log de los agentes para debugging
    sortedCustomAgents.forEach(agent => {
      console.log(`📊 [TeamPage] Custom Agent: ${agent.name} (${agent.retell_agent_id}) - Status: ${agent.status}`);
    });

  } catch (error: any) {
    console.error('❌ [TeamPage] Error fetching custom agents:', error);
    toast.error(`Error al cargar Custom Agents: ${error.message}`);
    setAgents([]); // Limpiar en caso de error total
  }
}, []);

// ========================================
// ✅ ACTUALIZACIÓN DEL HANDLE ADD AGENT
// ========================================

const handleAddAgent = useCallback(async (agentData: { 
  retell_agent_id: string; 
  name: string; 
  company_id?: string; 
  description?: string;
}) => {
  try {
    console.log('📝 [TeamPage] Adding new Custom AI Agent:', agentData);

    // ✅ Validar que el agente de Retell existe
    const exists = await verifyRetellAgentExists(agentData.retell_agent_id);
    if (!exists) {
      toast.error('❌ Agente de Retell AI no encontrado');
      return;
    }

    // ✅ Verificar si ya hay un Custom Agent con ese retell_agent_id
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id, name')
      .eq('retell_agent_id', agentData.retell_agent_id)
      .single();

    if (existingAgent) {
      toast.error(`❌ Ya existe un Custom Agent "${existingAgent.name}" asignado a este agente de Retell`);
      return;
    }

    // ✅ Crear nuevo Custom Agent
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
    await fetchAgents(); // Recargar lista de Custom Agents
    setAddAgentModal(false);

  } catch (error: any) {
    console.error('❌ [TeamPage] Error adding Custom Agent:', error);
    toast.error(`Error al crear Custom Agent: ${error.message}`);
  }
}, [fetchAgents]);
const handleViewAgent = useCallback(async (agent: Agent) => {
  try {
    console.log('👁️ [TeamPage] Viewing agent details:', agent.id);

    if (agent.retell_agent_id && !agent.retell_agent_id.includes('N/A')) {
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
        
        // ✅ Mostrar modal sin datos de Retell pero con información básica
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
      // Agente sin conexión a Retell
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
    await fetchAgents(); // Recargar lista
    setEditAgentModal({ open: false });

  } catch (error: any) {
    console.error('❌ [TeamPage] Error saving agent changes:', error);
    toast.error(`Error al actualizar agente: ${error.message}`);
  }
}, [fetchAgents]);

// ========================================
// ✅ FUNCIÓN DE DEBUGGING MEJORADA
// ========================================

const debugRetellConfiguration = useCallback(() => {
  console.log('🔧 [TeamPage] Debug - Configuración Retell:');
  console.log('API Key:', import.meta.env.VITE_RETELL_API_KEY ? '✅ Configurada' : '❌ No configurada');
  console.log('Base URL:', import.meta.env.VITE_RETELL_API_BASE_URL || 'https://api.retellai.com');
  console.log('Último error:', retellError || 'Sin errores');
  console.log('Última actualización:', lastRetellUpdate?.toLocaleTimeString() || 'Nunca');
  console.log('Agentes en cache:', retellAgents.length);
  
  // Test básico de conectividad
  if (import.meta.env.VITE_RETELL_API_KEY) {
    console.log('🔍 Probando conectividad...');
    loadRetellAgentsForModal();
  } else {
    console.error('❌ No se puede probar conectividad sin API key');
    toast.error('API key de Retell no configurada');
  }
}, [retellError, lastRetellUpdate, retellAgents.length, loadRetellAgentsForModal]);

// ✅ Hacer la función accesible desde la consola del navegador (temporal para debugging)
useEffect(() => {
  if (typeof window !== 'undefined') {
    (window as any).debugRetellConfiguration = debugRetellConfiguration;
    (window as any).clearRetellCache = clearAgentsCache;
    (window as any).forceReloadAgents = () => {
      clearAgentsCache();
      fetchAgents();
    };
  }
}, [debugRetellConfiguration, fetchAgents]);

// ========================================
// ✅ HANDLERS PARA ASIGNACIONES (SIN CAMBIOS MAYORES)
// ========================================

const handleEditAssignment = useCallback((assignment: UserAgentAssignment) => {
  setEditAssignmentModal({
    open: true,
    assignment: assignment
  });
}, []);

const handleDeleteAssignment = useCallback((assignment: UserAgentAssignment) => {
  setDeleteAssignmentModal({
    open: true,
    assignment: assignment
  });
}, []);

const handleSaveAssignmentChanges = useCallback(async (
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
}, [fetchAssignments]);

const handleConfirmDeleteAssignment = useCallback(async (assignmentId: string) => {
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
}, [fetchAssignments]);

const handleCreateAssignment = useCallback(async (assignmentData: {
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
}, [fetchAssignments]);
  // TeamPage.tsx - PARTE 6: HANDLERS DE MIEMBROS

// ========================================
// ✅ HANDLERS PARA MIEMBROS
// ========================================

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

    // ✅ Verificar si ya existe un usuario con ese email
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', memberData.email)
      .single();

    if (existingUser) {
      toast.error('❌ Ya existe un usuario registrado con ese email');
      return;
    }

    // ✅ Verificar si ya hay una invitación pendiente
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

    // ✅ Crear nueva invitación
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

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

    await fetchAllData(); // Recargar todos los datos
    setAddMemberModal(false);

  } catch (error: any) {
    console.error('❌ [TeamPage] Error enviando invitación:', error);
    toast.error(`Error inesperado: ${error.message}`, { id: 'sending-email' });
  }
}, [isSuperAdmin, user?.id, user?.email, fetchAllData]);

const handleEditMember = useCallback(async (memberId: string, updatedData: {
  name: string;
  email: string;
  role: string;
}) => {
  try {
    // ✅ Actualizar en user_profiles
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

    // ✅ Intentar actualizar en users también (puede fallar si no existe)
    const { error: userError } = await supabase
      .from('users')
      .update({
        email: updatedData.email,
        name: updatedData.name
      })
      .eq('id', memberId);

    if (userError) {
      console.warn('⚠️ [TeamPage] Error updating public.users:', userError);
    }

    toast.success('✅ Usuario actualizado exitosamente');
    await fetchTeamMembers();
    setEditMemberModal({ open: false });

  } catch (error: any) {
    console.error('❌ [TeamPage] Error editando miembro:', error);
    toast.error(`Error al editar usuario: ${error.message}`);
  }
}, [fetchTeamMembers]);

const handleDeleteMember = useCallback(async (memberId: string, memberEmail: string) => {
  try {
    // ✅ Proteger super administradores
    if (SUPER_ADMIN_EMAILS.includes(memberEmail)) {
      toast.error('❌ No se puede eliminar a un super administrador');
      return;
    }

    toast.loading('🗑️ Eliminando usuario...', { id: 'deleting-user' });

    // ✅ Eliminar en cascada todas las referencias del usuario
    const deletePromises = [
      supabase.from('user_agent_assignments').delete().eq('user_id', memberId),
      supabase.from('calls').delete().eq('user_id', memberId),
      supabase.from('transactions').delete().eq('user_id', memberId),
      supabase.from('user_credits').delete().eq('user_id', memberId),
      supabase.from('user_profiles').delete().eq('id', memberId),
      supabase.from('users').delete().eq('id', memberId),
      supabase.auth.admin.deleteUser(memberId)
    ];

    // Ejecutar todas las eliminaciones
    await Promise.allSettled(deletePromises);
    
    await fetchTeamMembers();
    setDeleteMemberModal({ open: false });
    toast.success('✅ Usuario eliminado completamente', { id: 'deleting-user' });

  } catch (error: any) {
    console.error('❌ [TeamPage] Error eliminando miembro:', error);
    toast.error(`Error al eliminar usuario: ${error.message}`, { id: 'deleting-user' });
  }
}, [fetchTeamMembers]);

// ========================================
// ✅ ESTADÍSTICAS Y CÁLCULOS
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

// ========================================
// ✅ VERIFICACIONES DE SEGURIDAD
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
  // TeamPage.tsx - PARTE 7: COMPONENTES DE MODALES

// ========================================
// COMPONENTES DE MODALES
// ========================================

interface AddMemberModalProps {
  onClose: () => void;
  onSave: (data: { email: string; name: string; role: string; company_id?: string }) => void;
  companies: Company[];
  currentUser: any;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onSave, companies, currentUser }) => {
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

interface EditMemberModalProps {
  member: TeamMember;
  onClose: () => void;
  onSave: (id: string, data: { name: string; email: string; role: string }) => void;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: member.name,
    email: member.email,
    role: member.role
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(member.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 max-w-full mx-4">
        <CardHeader>
          <CardTitle>Editar Miembro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
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
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
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
  );
};

interface DeleteMemberModalProps {
  member: TeamMember;
  onClose: () => void;
  onConfirm: (id: string, email: string) => void;
}

const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({ member, onClose, onConfirm }) => {
  return (
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
                ¿Estás seguro de eliminar a <strong>{member.name}</strong> ({member.email})?
              </p>
              <p className="text-xs text-red-600 mt-1">
                Esta acción eliminará completamente al usuario y no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={() => onConfirm(member.id, member.email)}
                variant="destructive"
              >
                Eliminar Usuario
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
  // TeamPage.tsx - PARTE 8: RENDER PRINCIPAL - HEADER Y ESTADÍSTICAS

// ========================================
// RENDER PRINCIPAL DEL COMPONENTE
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

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Agentes AI</p>
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
            {/* ✅ Debug info para desarrollo */}
            {import.meta.env.DEV && (
              <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
                <details>
                  <summary className="cursor-pointer font-medium">🔧 Debug Info (Development Only)</summary>
                  <div className="mt-2 space-y-1">
                    <div>Retell API Key: {import.meta.env.VITE_RETELL_API_KEY ? '✅ Configurada' : '❌ No configurada'}</div>
                    <div>Última actualización Retell: {lastRetellUpdate?.toLocaleString() || 'Nunca'}</div>
                    <div>Agentes en cache: {retellAgents.length}</div>
                    <div>Error actual: {retellError || 'Ninguno'}</div>
                    <button 
                      onClick={debugRetellConfiguration}
                      className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
                    >
                      Test Retell Connection
                    </button>
                  </div>
                </details>
              </div>
            )}
            {/* Tab: Miembros del Equipo */}
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

            {/* Tab: Agentes AI */}
            {/* Tab: Custom AI Agents - ✅ ACTUALIZADO */}
            <TabsContent value="agents" className="space-y-4 mt-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Custom AI Agents ({filteredAgents.length})</h3>
                <div className="flex gap-2">
                  <Button onClick={fetchAgents} variant="outline" size="sm" disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                  <Button onClick={() => setAddAgentModal(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Custom Agent
                  </Button>
                </div>
              </div>

              {/* ✅ Información sobre el flujo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Bot className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Custom AI Agents:</strong> Estos son tus agentes personalizados. Cada uno tiene asignado un agente de Retell AI como motor de voz.
                    {retellError && (
                      <div className="text-orange-700 mt-1">
                        ⚠️ {retellError} - Los datos de voz pueden no estar actualizados.
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
                  <Button onClick={() => setAddAgentModal(true)}>
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
                        {/* ✅ Avatar si existe */}
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

                            {/* ✅ Indicador de conexión con Retell */}
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
                            <span>Tarifa: <strong>{agent.rate_per_minute ? `$${agent.rate_per_minute}/min` : 'N/A'}</strong></span>
                          </div>
                          
                          {/* ✅ Información de Retell enriquecida */}
                          {agent.voice_id && agent.voice_id !== 'No disponible' && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-purple-600 mt-1">
                              <span>Voz: <strong>{agent.voice_id}</strong></span>
                              <span>Idioma: <strong>{agent.language || 'N/A'}</strong></span>
                              <span>LLM: <strong>{agent.llm_id || 'N/A'}</strong></span>
                            </div>
                          )}
                          
                          {/* ✅ Retell Agent ID */}
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

                        {/* ✅ Botón para reasignar agente de Retell */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Abrir modal para cambiar retell_agent_id
                            toast.info('Función de reasignar agente de Retell en desarrollo');
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reasignar Retell
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            {/* Tab: Asignaciones Usuario-Agente */}
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
      {/* ========================================
            TODOS LOS MODALES
            ======================================== */}
        
        {/* Modal de gestión de contraseñas */}
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
            MODALES PARA AGENTES
            ======================================== */}

        {/* Modal para agregar agente */}
        {addAgentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <AddAgentForm
                  onClose={() => setAddAgentModal(false)}
                  onSave={handleAddAgent}
                  companies={companies}
                  retellAgents={retellAgents}
                  loadingRetellAgents={loadingRetellAgents}
                  onLoadRetellAgents={loadRetellAgentsForModal}
                />
              </div>
            </div>
          </div>
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
                        {formatDate(agentDetailsModal.retellData.last_modification_time?.toString())}
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

        {/* Modal para editar agente */}
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

        {/* ========================================
            MODALES PARA ASIGNACIONES
            ======================================== */}

        {/* Modal para editar asignación */}
        {editAssignmentModal.open && editAssignmentModal.assignment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 max-w-full mx-4">
              <CardHeader>
                <CardTitle>Editar Asignación</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  handleSaveAssignmentChanges(editAssignmentModal.assignment!.id, {
                    agent_id: formData.get('agent_id') as string,
                    is_primary: formData.get('is_primary') === 'on'
                  });
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Usuario</label>
                    <Input value={editAssignmentModal.assignment.user_email} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Agente</label>
                    <select
                      name="agent_id"
                      defaultValue={editAssignmentModal.assignment.agent_id}
                      className="w-full border rounded px-3 py-2"
                      required
                    >
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.retell_agent_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="is_primary" 
                      name="is_primary"
                      defaultChecked={editAssignmentModal.assignment.is_primary}
                    />
                    <label htmlFor="is_primary" className="text-sm">
                      Asignación primaria
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setEditAssignmentModal({ open: false })}>
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

        {/* Modal para eliminar asignación */}
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
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  handleCreateAssignment({
                    user_id: assignmentModal.userId || formData.get('user_id') as string,
                    agent_id: formData.get('agent_id') as string,
                    is_primary: formData.get('is_primary') === 'on'
                  });
                }} className="space-y-4">
                  {!assignmentModal.userId && (
                    <select name="user_id" className="w-full border rounded px-3 py-2" required>
                      <option value="">Seleccionar usuario</option>
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.email} ({member.name})
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <select name="agent_id" className="w-full border rounded px-3 py-2" required>
                    <option value="">Seleccionar agente</option>
                    {agents.filter(agent => !agent.id.startsWith('retell-')).map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.retell_agent_id})
                      </option>
                    ))}
                  </select>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="primary" name="is_primary" />
                    <label htmlFor="primary" className="text-sm">
                      Asignación primaria
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setAssignmentModal({ open: false })}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Asignar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================
            MODALES PLACEHOLDER
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
      </div>
    </DashboardLayout>
  );
}

// ========================================
// EXPORT DEL COMPONENTE
// ========================================
