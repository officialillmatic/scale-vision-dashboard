// src/pages/TeamPage.tsx
// ✅ Full page with serverless invite flow, Add Member modal hookup, and clean UI scaffolding.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  UserPlus,
  Bot,
  Building2,
  Loader2,
  Mail,
  RefreshCw,
  Trash2,
  Copy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// If you have an auth hook, import it; otherwise we’ll use supabaseAuth
// import { useAuth } from '@/hooks/useAuth';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

interface Company {
  id: string;
  name: string;
  created_at?: string;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  status?: string;
  company_id?: string;
  created_at?: string;
}

interface Agent {
  id: string;
  name: string;
  provider: string;
  external_id?: string;
  created_at?: string;
}

interface UserInvitation {
  id: string;
  email: string;
  role: Role | string;
  // legacy fields
  company_id?: string;
  invitation_token?: string;
  // new system fields
  team_id?: string;
  token?: string;
  // common
  expires_at: string;
  created_at: string;
  status?: 'pending' | 'accepted' | 'expired' | 'revoked' | null;
}

interface UserAgentAssignment {
  id: string;
  agent_id: string;
  user_id: string;
  is_primary: boolean;
  created_at?: string;
}

const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];

function since(iso?: string) {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
  } catch {
    return '—';
  }
}

export default function TeamPage() {
  // If you have useAuth, use that instead:
  // const { user } = useAuth();
  const [user, setUser] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'agents' | 'companies'>('members');

  // Data
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<UserAgentAssignment[]>([]);

  // Filters
  const [memberQuery, setMemberQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [invitationQuery, setInvitationQuery] = useState('');
  const [invitationStatus, setInvitationStatus] = useState<'all' | 'pending' | 'accepted' | 'expired' | 'revoked'>('all');

  // Modals
  const [addMemberModal, setAddMemberModal] = useState<boolean>(false);
  const [addAgentModal, setAddAgentModal] = useState<boolean>(false);
  const [addCompanyModal, setAddCompanyModal] = useState<boolean>(false);

  // Role gate
  const isSuperAdmin = !!(user?.email && SUPER_ADMIN_EMAILS.includes(user.email));
  // --- NEW: simple myRole derivation; if you already compute it, reuse that instead
  const myRole: Role = isSuperAdmin ? 'owner' : 'admin';

  // Load current user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
    })();
  }, []);

  // Fetchers (adjust to your actual tables/views)
  const fetchMembers = useCallback(async () => {
    // You can replace this with your view or join
    const { data, error } = await supabase.from('team_members_view').select('*');
    if (error) {
      console.error(error);
      return;
    }
    setTeamMembers((data ?? []) as unknown as TeamMember[]);
  }, []);

  const fetchInvitations = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setInvitations((data ?? []) as unknown as UserInvitation[]);
  }, []);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase.from('companies').select('*').order('name', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setCompanies((data ?? []) as Company[]);
  }, []);

  const fetchAgents = useCallback(async () => {
    const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setAgents((data ?? []) as Agent[]);
  }, []);

  const fetchAssignments = useCallback(async () => {
    const { data, error } = await supabase.from('user_agent_assignments').select('*');
    if (error) {
      console.error(error);
      return;
    }
    setAssignments((data ?? []) as UserAgentAssignment[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchMembers(),
        fetchInvitations(),
        fetchCompanies(),
        fetchAgents(),
        fetchAssignments(),
      ]);
      setLoading(false);
    })();
  }, [fetchMembers, fetchInvitations, fetchCompanies, fetchAgents, fetchAssignments]);

  // Invitation status resolver
  const getInvitationRealStatus = (inv: UserInvitation) => {
    const now = new Date();
    const exp = new Date(inv.expires_at);
    if (inv.status === 'revoked') return 'revoked';
    if (now > exp) return 'expired';
    if (inv.status === 'accepted') return 'accepted';
    return 'pending';
  };

  // ✅ NEW: serverless invitation sender
  const handleSendInvitation = useCallback(
    async (memberData: { email: string; role: 'admin' | 'member' | 'viewer' }) => {
      try {
        const canManageTeam = myRole === 'owner' || myRole === 'admin';
        if (!canManageTeam) {
          toast.error('❌ Solo dueños o administradores pueden invitar.');
          return;
        }

        const { data: auth } = await supabase.auth.getUser();
        const currentUser = auth?.user;
        if (!currentUser) {
          toast.error('Debes iniciar sesión.');
          return;
        }

        // Resolve teamId via membership; swap with your own teamId state if you already have it
        let currentTeamId: string | null = null;
        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', currentUser.id)
          .limit(1)
          .maybeSingle();

        currentTeamId = membership?.team_id ?? null;

        if (!currentTeamId) {
          toast.error('⚠️ No hay equipo activo. Crea uno primero.');
          return;
        }

        toast.loading('Creando invitación...', { id: 'invite' });

        const r = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: currentTeamId,
            email: memberData.email,
            role: memberData.role,
          }),
        });

        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se pudo crear invitación');

        toast.success('✅ Invitación creada', { id: 'invite' });

        if (j.warn) {
          toast.info('🔗 Copia este enlace de invitación', {
            description: j.link,
            duration: 15000,
          });
        } else {
          toast.success('📧 Email enviado correctamente');
        }

        if (typeof fetchInvitations === 'function') {
          await fetchInvitations();
        }
      } catch (e: any) {
        console.error(e);
        toast.error(`Error al invitar: ${e.message}`, { id: 'invite' });
      }
    },
    [myRole, fetchInvitations]
  );

  // Existing: resend invitation (kept; uses your DB table directly)
  const handleResendInvitation = useCallback(
    async (inv: UserInvitation) => {
      try {
        toast.loading('Reenviando invitación...', { id: 'resending-invitation' });

        // delete previous
        const { error: delErr } = await supabase.from('team_invitations').delete().eq('id', inv.id);
        if (delErr) {
          toast.error('Error al eliminar invitación anterior', {
            id: 'resending-invitation',
            description: delErr.message,
          });
          return;
        }

        // create new
        const token = crypto.randomUUID();
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);

        const { error: insErr } = await supabase.from('team_invitations').insert({
          email: inv.email,
          role: inv.role,
          company_id: inv.company_id,
          invitation_token: token,
          expires_at: expires.toISOString(),
        });

        if (insErr) {
          toast.error('Error al crear nueva invitación', {
            id: 'resending-invitation',
            description: insErr.message,
          });
          return;
        }

        toast.success('Invitación reenviada correctamente', { id: 'resending-invitation' });
        await fetchInvitations();
      } catch (err: any) {
        console.error(err);
        toast.error('Error al reenviar invitación', {
          id: 'resending-invitation',
          description: err.message,
        });
      }
    },
    [fetchInvitations]
  );

  // Existing: delete invitation
  const handleDeleteInvitation = useCallback(
    async (invitationId: string) => {
      try {
        toast.loading('Eliminando invitación...', { id: 'deleting-invitation' });
        const { error } = await supabase.from('team_invitations').delete().eq('id', invitationId);
        if (error) {
          toast.error('Error al eliminar invitación', {
            id: 'deleting-invitation',
            description: error.message,
          });
          return;
        }
        toast.success('Invitación eliminada', { id: 'deleting-invitation' });
        await fetchInvitations();
      } catch (err: any) {
        console.error(err);
        toast.error('Error inesperado al eliminar invitación', {
          id: 'deleting-invitation',
          description: err.message,
        });
      }
    },
    [fetchInvitations]
  );

  // Derived UI data
  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    return teamMembers.filter((m) => {
      const matchesQuery =
        !q || m.email?.toLowerCase().includes(q) || (m.name ?? '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [teamMembers, memberQuery, roleFilter]);

  const filteredInvitations = useMemo(() => {
    const q = invitationQuery.trim().toLowerCase();
    return invitations.filter((inv) => {
      const matchesQuery = !q || inv.email.toLowerCase().includes(q);
      const status = getInvitationRealStatus(inv);
      const matchesStatus = invitationStatus === 'all' || status === invitationStatus;
      return matchesQuery && matchesStatus;
    });
  }, [invitations, invitationQuery, invitationStatus]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Cargando equipo...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Equipo</h2>
            <p className="text-sm text-muted-foreground">
              Administra usuarios, invitaciones, agentes y empresas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddMemberModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar miembro
            </Button>
            <Button variant="secondary" onClick={() => setAddAgentModal(true)}>
              <Bot className="w-4 h-4 mr-2" />
              Agregar agente
            </Button>
            <Button variant="outline" onClick={() => setAddCompanyModal(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Nueva empresa
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestión</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="members">Miembros</TabsTrigger>
                <TabsTrigger value="invitations">Invitaciones</TabsTrigger>
                <TabsTrigger value="agents">Agentes</TabsTrigger>
                <TabsTrigger value="companies">Empresas</TabsTrigger>
              </TabsList>

              {/* MEMBERS */}
              <TabsContent value="members">
                <div className="flex items-center gap-2 my-4">
                  <Input
                    placeholder="Buscar por nombre o email"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                  />
                  <select
                    className="border rounded px-3 py-2"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
                  >
                    <option value="all">Todos</option>
                    <option value="owner">Dueño</option>
                    <option value="admin">Admin</option>
                    <option value="member">Miembro</option>
                    <option value="viewer">Solo lectura</option>
                  </select>
                </div>

                <div className="rounded border">
                  <div className="grid grid-cols-5 text-xs uppercase text-muted-foreground px-4 py-2">
                    <div>Nombre</div>
                    <div>Email</div>
                    <div>Rol</div>
                    <div>Estado</div>
                    <div>Desde</div>
                  </div>
                  {filteredMembers.map((m) => (
                    <div key={m.id} className="grid grid-cols-5 items-center px-4 py-3 border-t text-sm">
                      <div className="font-medium">{m.name ?? '—'}</div>
                      <div className="text-muted-foreground">{m.email}</div>
                      <div>
                        <Badge variant="secondary">{String(m.role)}</Badge>
                      </div>
                      <div className="text-muted-foreground">{m.status ?? 'activo'}</div>
                      <div className="text-muted-foreground">{since(m.created_at)}</div>
                    </div>
                  ))}
                  {!filteredMembers.length && (
                    <div className="px-4 py-10 text-center text-muted-foreground text-sm">
                      No hay miembros que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* INVITATIONS */}
              <TabsContent value="invitations">
                <div className="flex items-center gap-2 my-4">
                  <Input
                    placeholder="Buscar invitaciones por email"
                    value={invitationQuery}
                    onChange={(e) => setInvitationQuery(e.target.value)}
                  />
                  <select
                    className="border rounded px-3 py-2"
                    value={invitationStatus}
                    onChange={(e) => setInvitationStatus(e.target.value as any)}
                  >
                    <option value="all">Todas</option>
                    <option value="pending">Pendientes</option>
                    <option value="accepted">Aceptadas</option>
                    <option value="expired">Expiradas</option>
                    <option value="revoked">Revocadas</option>
                  </select>
                </div>

                <div className="rounded border">
                  <div className="grid grid-cols-6 text-xs uppercase text-muted-foreground px-4 py-2">
                    <div>Email</div>
                    <div>Rol</div>
                    <div>Estado</div>
                    <div>Expira</div>
                    <div>Creada</div>
                    <div className="text-right">Acciones</div>
                  </div>
                  {filteredInvitations.map((inv) => {
                    const status = getInvitationRealStatus(inv);
                    return (
                      <div key={inv.id} className="grid grid-cols-6 items-center px-4 py-3 border-t text-sm">
                        <div className="text-muted-foreground">{inv.email}</div>
                        <div>
                          <Badge variant="secondary">{String(inv.role)}</Badge>
                        </div>
                        <div>
                          {status === 'pending' && <Badge>pendiente</Badge>}
                          {status === 'accepted' && <Badge variant="outline">aceptada</Badge>}
                          {status === 'expired' && <Badge variant="destructive">expirada</Badge>}
                          {status === 'revoked' && <Badge variant="secondary">revocada</Badge>}
                        </div>
                        <div className="text-muted-foreground">{since(inv.expires_at)}</div>
                        <div className="text-muted-foreground">{since(inv.created_at)}</div>
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Reenviar invitación"
                            onClick={() => handleResendInvitation(inv)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>

                          {/* Quick copy link (matches toast link when j.warn) */}
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Copiar enlace de invitación"
                            onClick={() => {
                              const link = `${window.location.origin}/accept-invitation?token=${inv.invitation_token}`;
                              navigator.clipboard.writeText(link);
                              toast.success('Enlace copiado al portapapeles');
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Eliminar invitación"
                            onClick={() => handleDeleteInvitation(inv.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!filteredInvitations.length && (
                    <div className="px-4 py-10 text-center text-muted-foreground text-sm">
                      No hay invitaciones que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* AGENTS */}
              <TabsContent value="agents">
                <div className="text-sm text-muted-foreground py-8">
                  Sección de agentes (placeholder). Implementa tu UI aquí.
                </div>
              </TabsContent>

              {/* COMPANIES */}
              <TabsContent value="companies">
                <div className="text-sm text-muted-foreground py-8">
                  Sección de empresas (placeholder). Implementa tu UI aquí.
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* MODALS */}
        {addMemberModal && (
          <AddMemberModal
            onClose={() => setAddMemberModal(false)}
            onSave={handleSendInvitation}
            companies={companies}
            currentUser={user}
          />
        )}

        {addAgentModal && (
          <AddAgentModal
            onClose={() => setAddAgentModal(false)}
            onSave={async () => {
              toast.info('Implementa la lógica para crear agente.');
              setAddAgentModal(false);
              await fetchAgents();
            }}
            companies={companies}
          />
        )}

        {addCompanyModal && (
          <AddCompanyModal
            onClose={() => setAddCompanyModal(false)}
            onSave={async (payload) => {
              const { error } = await supabase.from('companies').insert({ name: payload.name });
              if (error) {
                toast.error('No se pudo crear la empresa', { description: error.message });
                return;
              }
              toast.success('Empresa creada');
              setAddCompanyModal(false);
              await fetchCompanies();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================
   MODALS
   ============================ */

interface AddMemberModalProps {
  onClose: () => void;
  onSave: (data: { email: string; role: 'admin' | 'member' | 'viewer' }) => Promise<void> | void;
  companies: Company[];
  currentUser: any;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ onClose, onSave, companies }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'member' as 'admin' | 'member' | 'viewer',
    company_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({ email: formData.email, role: formData.role });
      if (typeof onClose === 'function') onClose();
    } catch {
      // Errors surfaced by toasts inside handleSendInvitation
    }
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
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              placeholder="Nombre (opcional)"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  role: e.target.value as 'admin' | 'member' | 'viewer',
                }))
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="member">Miembro</option>
              <option value="admin">Administrador</option>
              <option value="viewer">Solo lectura</option>
            </select>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, company_id: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Sin empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Enviar Invitación
                <Mail className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

interface AddAgentModalProps {
  onClose: () => void;
  onSave: (data: { name: string; provider: string }) => Promise<void> | void;
  companies: Company[];
}
const AddAgentModal: React.FC<AddAgentModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('retell');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 max-w-full mx-4">
        <CardHeader>
          <CardTitle>Agregar Agente</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSave({ name, provider });
              onClose();
            }}
            className="space-y-4"
          >
            <Input placeholder="Nombre del agente" value={name} onChange={(e) => setName(e.target.value)} />
            <select className="w-full border rounded px-3 py-2" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="retell">Retell</option>
              <option value="custom">Custom</option>
            </select>
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar
                <Bot className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

interface AddCompanyModalProps {
  onClose: () => void;
  onSave: (data: { name: string }) => Promise<void> | void;
}
const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96 max-w-full mx-4">
        <CardHeader>
          <CardTitle>Nueva Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSave({ name });
              onClose();
            }}
            className="space-y-4"
          >
            <Input placeholder="Nombre de la empresa" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear
                <Building2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
