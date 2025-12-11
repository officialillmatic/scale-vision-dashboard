// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'super_admin';

type TeamLite = {
  id: string;
  name: string;
  seat_limit: number | null;
};

type SessionState = {
  loading: boolean;
  user: any | null;
  currentTeam: TeamLite | null;
  teamRole: Role | null;
};

const AuthCtx = createContext<SessionState>({
  loading: true,
  user: null,
  currentTeam: null,
  teamRole: null,
});

export const useAuth = () => useContext(AuthCtx);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);
  const [teamRole, setTeamRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user ?? null;
      if (!mounted) return;

      setUser(u);

      if (!u) {
        // not logged in
        console.log('❌ [AUTH] No hay usuario autenticado');
        setCurrentTeam(null);
        setTeamRole(null);
        setLoading(false);
        return;
      }

      console.log('✅ [AUTH] Usuario autenticado:', u.email);

      // 🔥 CRÍTICO: VERIFICAR SUPER_ADMINS PRIMERO
      console.log('🔍 [AUTH] Verificando super_admins...');
      const { data: superAdminData, error: superErr } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();

      if (superErr) {
        console.error('❌ [AUTH] Error verificando super_admins:', superErr);
      }

      // Si es SUPER ADMIN → acceso completo y salir
      if (superAdminData) {
        console.log('👑 [AUTH] Usuario es SUPER ADMIN - acceso completo');
        if (!mounted) return;
        setCurrentTeam(null); // Super admin no necesita team
        setTeamRole('super_admin');
        setLoading(false);
        return; // ✅ SALIR AQUÍ - super admin listo
      }

      console.log('👤 [AUTH] Usuario regular - verificando teams...');

      // Solo si NO es super admin, verificar team_members
      const { data: mem, error: memErr } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', u.id)
        .limit(1)
        .maybeSingle();

      if (memErr) {
        console.warn('[AUTH] team_members read error (RLS?)', memErr);
      }

      if (!mem) {
        console.log('ℹ️ [AUTH] Usuario sin team asignado');
        if (!mounted) return;
        setCurrentTeam(null);
        setTeamRole(null);
        setLoading(false);
        return;
      }

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, seat_limit')
        .eq('id', mem.team_id)
        .single();

      if (teamErr) {
        console.warn('[AUTH] teams read error (RLS?)', teamErr);
        if (!mounted) return;
        setCurrentTeam(null);
        setTeamRole(mem.role as Role);
        setLoading(false);
        return;
      }

      console.log('✅ [AUTH] Usuario con team:', team.name);
      if (!mounted) return;
      setCurrentTeam(team as TeamLite);
      setTeamRole(mem.role as Role);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      // re-run init on sign in/out
      console.log('🔄 [AUTH] Auth state changed:', _event);
      init();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ loading, user, currentTeam, teamRole }),
    [loading, user, currentTeam, teamRole]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
