// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

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
      try {
        setLoading(true);
        console.log('🔄 [AUTH] Iniciando autenticación...');
        
        const { data: auth } = await supabase.auth.getUser();
        const u = auth?.user ?? null;
        
        if (!mounted) return;

        setUser(u);

        if (!u) {
          console.log('❌ [AUTH] Usuario no autenticado');
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
          return;
        }

        console.log('✅ [AUTH] Usuario autenticado:', u.email);

        // ============================================================
        // PASO 1: PRIMERO verificar si es Super Admin
        // ============================================================
        console.log('🔍 [AUTH] Verificando super_admins...');
        
        const { data: superAdminData, error: superAdminError } = await supabase
          .from('super_admins')
          .select('id, user_id, email')
          .eq('user_id', u.id)
          .maybeSingle();

        if (superAdminError && superAdminError.code !== 'PGRST116') {
          console.error('⚠️ [AUTH] Error verificando super_admins:', superAdminError.message);
        }

        const isSuperAdmin = !!superAdminData;

        if (!mounted) return;

        if (isSuperAdmin) {
          console.log('👑 [AUTH] Usuario es SUPER ADMIN - acceso completo');
          // Super admins tienen acceso completo sin necesidad de team
          setCurrentTeam(null);
          setTeamRole('owner'); // Super admin = permisos de owner
          setLoading(false);
          return; // ⚠️ IMPORTANTE: Salir aquí para super admins
        }

        console.log('👤 [AUTH] Usuario regular - verificando teams...');

        // ============================================================
        // PASO 2: Para usuarios regulares, buscar team membership
        // ============================================================
        const { data: mem, error: memErr } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', u.id)
          .limit(1)
          .maybeSingle();

        if (memErr && memErr.code !== 'PGRST116') {
          console.warn('⚠️ [AUTH] Error leyendo team_members:', memErr.message);
        }

        if (!mounted) return;

        if (!mem) {
          console.log('ℹ️ [AUTH] Usuario sin team asignado');
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
          return;
        }

        console.log('✅ [AUTH] Membresía en team encontrada');

        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id, name, seat_limit')
          .eq('id', mem.team_id)
          .single();

        if (!mounted) return;

        if (teamErr) {
          console.warn('⚠️ [AUTH] Error obteniendo team:', teamErr.message);
          setCurrentTeam(null);
          setTeamRole(mem.role as Role);
          setLoading(false);
          return;
        }

        console.log('✅ [AUTH] Team cargado:', team?.name);
        setCurrentTeam(team as TeamLite);
        setTeamRole(mem.role as Role);
        setLoading(false);

      } catch (error: any) {
        console.error('💥 [AUTH] Error crítico:', error);
        if (mounted) {
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('🔔 [AUTH] Auth state cambió:', event);
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
