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
  isSuperAdmin: boolean;
};

const AuthCtx = createContext<SessionState>({
  loading: true,
  user: null,
  currentTeam: null,
  teamRole: null,
  isSuperAdmin: false,
});

export const useAuth = () => useContext(AuthCtx);

// Función para verificar super admin
const checkSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Error checking super admin:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[Auth] Exception checking super admin:', error);
    return false;
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);
  const [teamRole, setTeamRole] = useState<Role | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        
        // Usar getSession en lugar de getUser - más rápido y confiable
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        
        if (!mounted) return;

        setUser(u);

        if (!u) {
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        // Verificar super admin
        const isSuper = await checkSuperAdmin(u.id);
        
        if (!mounted) return;
        
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          console.log('[Auth] Super admin detected:', u.email);
          // Super admins no necesitan team, salir aquí
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
          return;
        }

        // Solo cargar team si NO es super admin
        try {
          const { data: mem } = await supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', u.id)
            .limit(1)
            .maybeSingle();

          if (!mem) {
            setCurrentTeam(null);
            setTeamRole(null);
            setLoading(false);
            return;
          }

          const { data: team } = await supabase
            .from('teams')
            .select('id, name, seat_limit')
            .eq('id', mem.team_id)
            .single();

          if (team) {
            setCurrentTeam(team as TeamLite);
            setTeamRole(mem.role as Role);
          }
        } catch (teamError) {
          console.warn('[Auth] Error loading team:', teamError);
        }

        setLoading(false);

      } catch (error) {
        console.error('[Auth] Init error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    // Listener de auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Esperar un momento para sincronización
        await new Promise(resolve => setTimeout(resolve, 100));
        await init();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentTeam(null);
        setTeamRole(null);
        setIsSuperAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ loading, user, currentTeam, teamRole, isSuperAdmin }),
    [loading, user, currentTeam, teamRole, isSuperAdmin]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
