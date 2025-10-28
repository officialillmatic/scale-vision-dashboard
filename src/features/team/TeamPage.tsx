import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Role = 'owner'|'admin'|'member'|'viewer';
type Member = { user_id: string; role: Role; email?: string };
type Invite = { id: string; email: string; role: Role; status: string; created_at: string; token?: string };
type Usage = { seat_limit: number; seats_used: number };

export default function TeamPage({ teamId }: { teamId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [meRole, setMeRole] = useState<Role>('viewer');

  const canManage = useMemo(() => ['owner','admin'].includes(meRole), [meRole]);

  async function load() {
    setLoading(true);

    // miembros
    const { data: ms } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', teamId);

    // mi rol
    const { data: me } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    // invitaciones
    const { data: inv } = await supabase
      .from('team_invites')
      .select('id,email,role,status,created_at,token')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    // uso de seats
    const { data: us } = await supabase
      .from('team_seat_usage')
      .select('seat_limit, seats_used')
      .eq('team_id', teamId)
      .single();

    // enriquecer con emails
    let mems: Member[] = (ms || []) as any;
    try {
      const { data: emails } = await supabase.rpc('get_member_emails', { p_team_id: teamId });
      const map = new Map<string,string>(emails?.map((e:any)=>[e.user_id, e.email]) ?? []);
      mems = mems.map(m => ({ ...m, email: map.get(m.user_id) }));
    } catch {}

    setMembers(mems);
    setMeRole((me?.role as Role) ?? 'viewer');
    setInvites((inv || []) as any);
    setUsage(us as any);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel(`team:${teamId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'team_members', filter:`team_id=eq.${teamId}` }, load)
      .on('postgres_changes', { event:'*', schema:'public', table:'team_invites', filter:`team_id=eq.${teamId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [teamId]);

  async function invite(email: string, role: Role) {
    const r = await fetch('/api/team/invite', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ teamId, email, role })});
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Error al invitar');
    if (j.warn) alert('No se pudo enviar el correo, copia el link: ' + j.link);
    load();
  }

  async function accept(token: string) {
    const { data:{ user } } = await supabase.auth.getUser();
    const r = await fetch('/api/team/accept', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token, userId: user?.id })
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || 'Error al aceptar');
    load();
  }

  async function removeMember(userId: string) {
    if (!confirm('¿Eliminar miembro?')) return;
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
    if (error) alert(error.message);
  }

  async function changeRole(userId: string, role: Role) {
    const { error } = await supabase.from('team_members').upsert({ team_id: teamId, user_id: userId, role });
    if (error) alert(error.message);
  }

  if (loading) return <div className="p-6">Cargando equipo…</div>;

  return (
    <div className="p-6 space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Equipos</h1>
          <p className="text-sm opacity-70">Rol: {meRole}</p>
        </div>
        {usage && (
          <div className="text-sm">
            Seats: <b>{usage.seats_used}</b> / <b>{usage.seat_limit}</b>
          </div>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Miembros</h2>
        <ul className="divide-y rounded border">
          {members.map(m => (
            <li key={m.user_id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{m.email ?? m.user_id}</div>
                <div className="text-xs opacity-70">{m.role}</div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <>
                    <select value={m.role} onChange={e => changeRole(m.user_id, e.target.value as Role)} className="border rounded px-2 py-1">
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <button onClick={() => removeMember(m.user_id)} className="px-3 py-1 border rounded">Eliminar</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Invitaciones</h2>
        {canManage && <InviteForm onInvite={invite}/>}
        <ul className="divide-y rounded border">
          {invites.map(i => (
            <li key={i.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-medium">{i.email}</div>
                <div className="text-xs opacity-70">{i.role} • {i.status}</div>
              </div>
              <div className="flex items-center gap-2">
                {i.token && (
                  <button onClick={() => navigator.clipboard.writeText(`${location.origin}/accept?token=${i.token}`)} className="px-3 py-1 border rounded">
                    Copiar enlace
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Aceptar invitación (prueba manual)</h3>
        <AcceptForm onAccept={accept}/>
      </section>
    </div>
  );
}

function InviteForm({ onInvite }: { onInvite: (email: string, role: Role) => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  return (
    <div className="flex gap-2">
      <input className="border rounded px-3 py-2 w-72" placeholder="email@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
      <select className="border rounded px-2" value={role} onChange={e => setRole(e.target.value as Role)}>
        <option value="member">member</option>
        <option value="viewer">viewer</option>
        <option value="admin">admin</option>
      </select>
      <button onClick={() => onInvite(email, role)} className="px-4 py-2 border rounded">Invitar</button>
    </div>
  );
}

function AcceptForm({ onAccept }: { onAccept: (token: string) => void }) {
  const [token, setToken] = useState('');
  return (
    <div className="flex gap-2">
      <input className="border rounded px-3 py-2 w-[420px]" placeholder="pega aquí el token del link" value={token} onChange={e => setToken(e.target.value)} />
      <button onClick={() => onAccept(token)} className="px-4 py-2 border rounded">Aceptar</button>
    </div>
  );
}
