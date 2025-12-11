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
  isSuperAdmin: boolean; // NUEVO: indicador de super admin
};

const AuthCtx = createContext<SessionState>({
  loading: true,
  user: null,
  currentTeam: null,
  teamRole: null,
  isSuperAdmin: false,
});

export const useAuth = () => useContext(AuthCtx);

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
        
        // 1. Obtener usuario autenticado
        const { data: auth, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('[AuthContext] Auth error:', authError);
        }
        
        const u = auth?.user ?? null;
        
        if (!mounted) return;

        setUser(u);

        if (!u) {
          // No hay usuario autenticado
          console.log('[AuthContext] No authenticated user');
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] User authenticated:', u.email);

        // 2. PRIMERO: Verificar si es super admin
        const { data: superAdminData, error: superAdminError } = await supabase
          .from('super_admins')
          .select('*')
          .eq('user_id', u.id)
          .maybeSingle();

        if (superAdminError) {
          console.warn('[AuthContext] Error checking super_admins (RLS?):', superAdminError);
        }

        const isSuper = !!superAdminData;
        
        console.log('[AuthContext] Super admin check:', {
          user_id: u.id,
          email: u.email,
          is_super_admin: isSuper,
          super_admin_record: superAdminData
        });

        setIsSuperAdmin(isSuper);

        if (isSuper) {
          // Si es super admin, no necesita team
          console.log('✅ [AuthContext] User is SUPER ADMIN - full access granted');
          setCurrentTeam(null);
          setTeamRole('admin' as Role); // Dar rol admin para compatibilidad
          setLoading(false);
          return;
        }

        // 3. SOLO si NO es super admin: Verificar team membership
        console.log('[AuthContext] Not super admin, checking team membership...');
        
        const { data: mem, error: memErr } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', u.id)
          .limit(1)
          .maybeSingle();

        if (memErr) {
          console.warn('[AuthContext] team_members read error (RLS?):', memErr);
        }

        if (!mem) {
          console.log('[AuthContext] No team membership found');
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Team membership found:', mem);

        // 4. Obtener datos del team
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id, name, seat_limit')
          .eq('id', mem.team_id)
          .single();

        if (teamErr) {
          console.warn('[AuthContext] teams read error (RLS?):', teamErr);
          setCurrentTeam(null);
          setTeamRole(mem.role as Role);
          setLoading(false);
          return;
        }

        console.log('[AuthContext] Team data loaded:', team);
        setCurrentTeam(team as TeamLite);
        setTeamRole(mem.role as Role);
        setLoading(false);
        
      } catch (error) {
        console.error('[AuthContext] Unexpected error in init():', error);
        if (mounted) {
          setUser(null);
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    }

    init();

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('[AuthContext] Auth state changed:', event);
      // Re-ejecutar init en cambios de autenticación
      init();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ 
      loading, 
      user, 
      currentTeam, 
      teamRole,
      isSuperAdmin 
    }),
    [loading, user, currentTeam, teamRole, isSuperAdmin]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
