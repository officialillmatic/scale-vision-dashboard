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
  Key  // 🔑 NUEVO IMPORT
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { sendInvitationEmail } from '@/services/send-invitation/email';
import { AdminPasswordManager } from '@/components/admin/AdminPasswordManager'; // 🔑 NUEVO IMPORT

// ========================================
// INTERFACES
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
// ========================================
// MODAL PARA INVITAR MIEMBRO (NUEVO)
// ========================================

const AddMemberModal: React.FC<{
  onClose: () => void;
  onSave: (memberData: { email: string; name: string; company_id?: string; role: string }) => Promise<void>;
  companies: Company[];
  currentUser: any;
}> = ({ onClose, onSave, companies, currentUser }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    company_id: '',
    role: 'user'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.name.trim()) {
      toast.error('Email y nombre son obligatorios');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Formato de email inválido');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        email: formData.email.trim(),
        name: formData.name.trim(),
        company_id: formData.company_id || undefined,
        role: formData.role
      });
    } catch (error) {
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Invitar Nuevo Miembro
          </CardTitle>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Se enviará una invitación por email para unirse al equipo
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Crown className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-800 font-medium">
                  Super Admin: {currentUser?.email}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@ejemplo.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Se enviará la invitación a este email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre completo *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre completo del usuario"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Empresa</label>
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

            <div>
              <label className="block text-sm font-medium mb-2">Rol</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
                <option value="super_admin">Super Administrador</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                El usuario tendrá estos permisos una vez que acepte
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-800 font-medium">🔒 Privilegios de Super Admin</p>
                  <ul className="text-amber-700 text-xs mt-1 space-y-1">
                    <li>• Solo super admins pueden invitar usuarios</li>
                    <li>• Esta acción queda registrada para auditoría</li>
                    <li>• El usuario recibirá email de invitación</li>
                    <li>• La invitación expira en 7 días</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar Invitación
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
// ========================================
// MODAL PARA EDITAR MIEMBRO (EXISTENTE)
// ========================================

const EditMemberModal: React.FC<{
  member: TeamMember;
  onClose: () => void;
  onSave: (memberId: string, updatedData: { name: string; email: string; role: string }) => Promise<void>;
}> = ({ member, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: member.name,
    email: member.email,
    role: member.role
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Nombre y email son obligatorios');
      return;
    }

    setSaving(true);
    try {
      await onSave(member.id, formData);
    } catch (error) {
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Editar Usuario</CardTitle>
          <p className="text-sm text-muted-foreground">
            ID: {member.id.slice(0, 8)}...
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@ejemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rol</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="member">Miembro</option>
                <option value="admin">Administrador</option>
                <option value="super_admin">Super Administrador</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ========================================
// MODAL PARA ELIMINAR MIEMBRO (EXISTENTE)
// ========================================

const DeleteMemberModal: React.FC<{
  member: TeamMember;
  onClose: () => void;
  onConfirm: (memberId: string, memberEmail: string) => Promise<void>;
}> = ({ member, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm(member.id, member.email);
    } catch (error) {
      // Error ya manejado en onConfirm
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
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
                Se eliminará completamente del sistema.
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
                Cancelar
              </Button>
              <Button 
                onClick={handleDelete} 
                disabled={deleting}
                variant="destructive"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
// ========================================
// COMPONENTE PRINCIPAL - INICIO
// ========================================

export default function TeamPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Estados para cada pestaña
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

  // 🔑 NUEVO ESTADO PARA MODAL DE CONTRASEÑA
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    member?: TeamMember;
  }>({ open: false });

  // Verificación de super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchAllData();
      
      // 🔄 LISTENER PARA REFRESCAR CUANDO SE REGISTRA UN USUARIO
      const handleTeamMemberRegistered = (event: any) => {
        console.log('🔄 [TeamPage] Team member registered event received:', event.detail);
        
        // Esperar un poco y luego refrescar
        setTimeout(() => {
          console.log('🔄 [TeamPage] Refreshing team data after new registration...');
          fetchAllData();
        }, 1000);
      };

      // Escuchar eventos de registro
      window.addEventListener('teamMemberRegistered', handleTeamMemberRegistered);

      // Cleanup
      return () => {
        window.removeEventListener('teamMemberRegistered', handleTeamMemberRegistered);
      };
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    applyFilters();
  }, [teamMembers, agents, companies, assignments, invitations, searchQuery, statusFilter, activeTab]);

  // 🔑 NUEVA FUNCIÓN PARA MANEJAR CAMBIO DE CONTRASEÑA
  const handlePasswordChanged = () => {
    toast.success('✅ Password updated successfully');
    // Opcional: refrescar datos de usuarios
    fetchTeamMembers();
  };
  // ========================================
  // FUNCIONES DE FETCH
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

      // 2. Consultar miembros de empresas desde company_members
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

      // 4. Combinar datos de todas las fuentes
      const combinedMembers: TeamMember[] = usersData.map(user => {
        const profile = profilesData.find(p => p.id === user.id);
        const credit = creditsData.find(c => c.user_id === user.id);
        const userCalls = callsData.filter(c => c.user_id === user.id);
        
        // 🎯 BUSCAR EN COMPANY_MEMBERS PARA OBTENER LA EMPRESA CORRECTA
        const companyMember = companyMembers.find(cm => cm.user_id === user.id);

        const totalSpent = userCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const currentBalance = credit?.current_balance || 0;

        return {
          id: user.id,
          email: user.email || profile?.email || `user-${user.id.slice(0, 8)}`,
          name: user.name || user.full_name || profile?.name || user.email || 'Usuario',
          // 🎯 PRIORIZAR ROLE DE COMPANY_MEMBERS
          role: companyMember?.role || profile?.role || user.role || 'user',
          status: currentBalance > 0 ? 'active' : 'inactive',
          // 🎯 PRIORIZAR COMPANY DE COMPANY_MEMBERS
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

      // 5. Ordenar: primero los que tienen empresa, luego por fecha
      const sortedMembers = combinedMembers.sort((a, b) => {
        // Priorizar usuarios con empresa
        if (a.company_id && !b.company_id) return -1;
        if (!a.company_id && b.company_id) return 1;
        
        // Luego por fecha de creación (más recientes primero)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTeamMembers(sortedMembers);
      console.log('✅ Team members loaded successfully:', sortedMembers.length);
      console.log('👥 Members with companies:', sortedMembers.filter(m => m.company_id).length);

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
        throw agentsError;
      }

      if (!agentsData) {
        setAgents([]);
        return;
      }

      const combinedAgents: Agent[] = agentsData.map(agent => ({
        id: agent.id,
        name: agent.name || 'Agente Sin Nombre',
        retell_agent_id: agent.retell_agent_id || 'N/A',
        company_id: agent.company_id,
        company_name: null,
        assigned_users: 0,
        total_calls: 0,
        status: 'active',
        created_at: agent.created_at || new Date().toISOString(),
        description: agent.description
      }));

      setAgents(combinedAgents);

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

  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_agent_assignments')
        .select('*');

      if (assignmentsError) {
        console.error('❌ Error fetching assignments:', assignmentsError);
        setAssignments([]);
        return;
      }

      if (!assignmentsData) {
        setAssignments([]);
        return;
      }

      const combinedAssignments: UserAgentAssignment[] = assignmentsData.map(assignment => ({
        id: assignment.id,
        user_id: assignment.user_id,
        agent_id: assignment.agent_id,
        user_email: 'user@example.com',
        user_name: 'Usuario',
        agent_name: 'Agente',
        is_primary: assignment.is_primary || false,
        created_at: new Date().toISOString()
      }));

      setAssignments(combinedAssignments);

    } catch (error: any) {
      console.error('❌ Error fetching assignments:', error);
      setAssignments([]);
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
        name: invitation.email, // Usar email como nombre temporalmente
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
  // FUNCIONES DE MANEJO
  // ========================================

  // Función para enviar invitación CON EMAIL AUTOMÁTICO
  const handleSendInvitation = async (memberData: {
    email: string;
    name: string;
    company_id?: string;
    role: string;
  }) => {
    try {
      // 🔒 VERIFICACIÓN CRÍTICA DE SEGURIDAD
      if (!isSuperAdmin) {
        toast.error('❌ Acceso denegado: Solo super administradores pueden enviar invitaciones');
        console.error('🚨 Intento no autorizado de enviar invitación por:', user?.email);
        return;
      }

      console.log('📧 Super admin enviando invitación:', user?.email, '→', memberData.email);

      // 1. Verificar que el email no exista ya como usuario
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', memberData.email)
        .single();

      if (existingUser) {
        toast.error('❌ Ya existe un usuario registrado con ese email');
        return;
      }

      // 2. Verificar que no haya invitación pendiente
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

      // 3. Generar token único y fecha de expiración
      const invitationToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

      // 4. Crear invitación en la base de datos
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
        console.error('❌ Error creating invitation:', invitationError);
        toast.error(`Error creando invitación: ${invitationError.message}`);
        return;
      }

      // 5. Enviar email automáticamente
      toast.loading('📧 Enviando invitación por email...', { id: 'sending-email' });
      
      try {
        await sendInvitationEmail({
          email: memberData.email,
          token: invitationToken,
          role: memberData.role,
          company_name: 'Dr. Scale AI',
          invited_by_email: user?.email
        });
        
        // 6. Éxito - Email enviado
        toast.success('✅ Invitación enviada exitosamente por email', {
          id: 'sending-email',
          description: `Invitación enviada a ${memberData.email}`,
          duration: 5000
        });
        
      } catch (emailError: any) {
        console.error('❌ Error sending email:', emailError);
        
        // 7. Fallback - Mostrar URL manual si el email falla
        const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitationToken}`;
        
        toast.error('⚠️ Error enviando email - URL manual generada', {
          id: 'sending-email',
          description: 'La invitación se creó pero no se pudo enviar el email',
          duration: 10000
        });
        
        toast.info('🔗 URL de invitación (copiar manualmente)', {
          description: invitationUrl,
          duration: 15000
        });
      }

      // 8. Registrar la acción en logs (para auditoría)
      console.log(`✅ INVITACIÓN CREADA:
        Super Admin: ${user?.email}
        Invitado: ${memberData.email} (${memberData.name})
        Rol: ${memberData.role}
        Token: ${invitationToken}
        Expira: ${expiresAt.toLocaleDateString()}
      `);

      // 9. Actualizar la lista y cerrar modal
      await fetchAllData();
      setAddMemberModal(false);

    } catch (error: any) {
      console.error('❌ Error enviando invitación:', error);
      toast.error(`Error inesperado: ${error.message}`, { id: 'sending-email' });
    }
  };

  // Función para editar miembro
  const handleEditMember = async (memberId: string, updatedData: {
    name: string;
    email: string;
    role: string;
  }) => {
    try {
      console.log('✏️ Editando miembro:', memberId, updatedData);

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

  // Función para eliminar miembro COMPLETAMENTE
  const handleDeleteMember = async (memberId: string, memberEmail: string) => {
    try {
      console.log('🗑️ Eliminando miembro completamente:', memberId, memberEmail);

      // Verificación de super admin
      if (SUPER_ADMIN_EMAILS.includes(memberEmail)) {
        toast.error('❌ No se puede eliminar a un super administrador');
        return;
      }

      // Mostrar loading
      toast.loading('🗑️ Eliminando usuario...', { id: 'deleting-user' });

      // Eliminar de todas las tablas en paralelo para mayor velocidad
      const deletePromises = [
        // Asignaciones usuario-agente
        supabase.from('user_agent_assignments').delete().eq('user_id', memberId),
        
        // Llamadas del usuario
        supabase.from('calls').delete().eq('user_id', memberId),
        
        // Transacciones del usuario
        supabase.from('transactions').delete().eq('user_id', memberId),
        
        // Créditos del usuario
        supabase.from('user_credits').delete().eq('user_id', memberId),
        
        // Perfil del usuario
        supabase.from('user_profiles').delete().eq('id', memberId),
        
        // Usuario de tabla pública
        supabase.from('users').delete().eq('id', memberId),
        
        // Intentar eliminar de Authentication también
        supabase.auth.admin.deleteUser(memberId)
      ];

      // Ejecutar todas las eliminaciones en paralelo
      await Promise.allSettled(deletePromises);

      // Actualizar la lista
      await fetchTeamMembers();
      
      // Cerrar modal y mostrar éxito
      setDeleteMemberModal({ open: false });
      toast.success('✅ Usuario eliminado completamente', { id: 'deleting-user' });

    } catch (error: any) {
      console.error('❌ Error eliminando miembro:', error);
      toast.error(`Error al eliminar usuario: ${error.message}`, { id: 'deleting-user' });
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

  // ========================================
  // STATS Y VERIFICACIONES
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
  // VERIFICACIONES DE SEGURIDAD
  // ========================================

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
  // RETURN JSX - PARTE 1: HEADER Y STATS
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
            {/* 🔑 NUEVO BADGE */}
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
                          {/* 🔑 NUEVO BOTÓN DE CONTRASEÑA */}
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

              {/* Tab: Agentes */}
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
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                              <span>Empresa: <strong>{agent.company_name || 'N/A'}</strong></span>
                              <span>Usuarios: <strong>{agent.assigned_users}</strong></span>
                              <span>Llamadas: <strong>{agent.total_calls}</strong></span>
                              <span>Creado: <strong>{formatDate(agent.created_at)}</strong></span>
                            </div>
                            
                            {agent.description && (
                              <p className="text-xs text-gray-500 mt-1">{agent.description}</p>
                            )}
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

              {/* Tab: Asignaciones */}
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
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
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
        {/* 🔑 NUEVO MODAL DE GESTIÓN DE CONTRASEÑAS */}
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

        {/* Modal Invitar Miembro (NUEVO) */}
        {addMemberModal && (
          <AddMemberModal
            onClose={() => setAddMemberModal(false)}
            onSave={handleSendInvitation}
            companies={companies}
            currentUser={user}
          />
        )}

        {/* Modales Placeholder (Sin cambios) */}
        {addAgentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Agregar Nuevo Agente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input placeholder="Nombre del agente" />
                  <Input placeholder="Retell Agent ID" />
                  <select className="w-full border rounded px-3 py-2">
                    <option value="">Seleccionar empresa</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  <Input placeholder="Descripción (opcional)" />
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={() => setAddAgentModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => {
                    toast.success('Funcionalidad en desarrollo');
                    setAddAgentModal(false);
                  }}>
                    Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
