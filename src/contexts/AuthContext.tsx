// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

type TeamLite = {
  id: string;
  name: string;
  seat_limit: number | null;
};

type UserProfile = {
  id: string;
  email: string;
  name?: string;
  role: string;
  company_id?: string;
};

type SessionState = {
  loading: boolean;
  user: any | null;
  userProfile: UserProfile | null;
  currentTeam: TeamLite | null;
  teamRole: Role | null;
  isSuperAdmin: boolean;
};

const AuthCtx = createContext<SessionState>({
  loading: true,
  user: null,
  userProfile: null,
  currentTeam: null,
  teamRole: null,
  isSuperAdmin: false,
});

export const useAuth = () => useContext(AuthCtx);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);
  const [teamRole, setTeamRole] = useState<Role | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        console.log('🔄 [AUTH] Iniciando autenticación...');
        
        const { data: auth, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ [AUTH] Error obteniendo usuario:', authError);
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            setCurrentTeam(null);
            setTeamRole(null);
            setIsSuperAdmin(false);
            setLoading(false);
          }
          return;
        }

        const u = auth?.user ?? null;
        
        if (!mounted) return;

        setUser(u);

        if (!u) {
          console.log('❌ [AUTH] Usuario no autenticado');
          setUserProfile(null);
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
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

        const isSuper = !!superAdminData;
        
        if (!mounted) return;
        
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          console.log('👑 [AUTH] ¡Usuario es SUPER ADMIN!');
        } else {
          console.log('👤 [AUTH] Usuario regular');
        }

        // ============================================================
        // PASO 2: Obtener perfil de usuario_profiles
        // ============================================================
        console.log('🔍 [AUTH] Obteniendo user_profile...');
        
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, email, name, role, company_id')
          .eq('id', u.id)
          .maybeSingle();

        if (profileError) {
          console.error('❌ [AUTH] Error obteniendo user_profile:', profileError);
        }

        if (!mounted) return;

        if (profile) {
          console.log('✅ [AUTH] Perfil encontrado:', {
            email: profile.email,
            role: profile.role,
            name: profile.name
          });
          
          setUserProfile({
            id: profile.id,
            email: profile.email,
            name: profile.name || undefined,
            role: profile.role || 'member',
            company_id: profile.company_id || undefined
          });
        } else {
          console.warn('⚠️ [AUTH] No se encontró user_profile, creando perfil básico');
          setUserProfile({
            id: u.id,
            email: u.email || '',
            role: isSuper ? 'super_admin' : 'member'
          });
        }

        // ============================================================
        // PASO 3: Si es SUPER ADMIN, dar acceso completo SIN buscar teams
        // ============================================================
        if (isSuper) {
          console.log('✅ [AUTH] Super Admin detectado - acceso completo otorgado');
          console.log('✅ [AUTH] Saltando búsqueda de teams (no necesario para super admin)');
          
          if (!mounted) return;
          
          setCurrentTeam(null);
          setTeamRole('owner'); // Super admin tiene permisos máximos
          setLoading(false);
          return; // ⚠️ IMPORTANTE: Salir aquí para super admins
        }

        // ============================================================
        // PASO 4: Solo para usuarios regulares - buscar team
        // ============================================================
        console.log('🔍 [AUTH] Usuario regular - buscando membresía en teams...');
        
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

        console.log('✅ [AUTH] Membresía en team encontrada:', mem.team_id);

        // ============================================================
        // PASO 5: Obtener información del team
        // ============================================================
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id, name, seat_limit')
          .eq('id', mem.team_id)
          .maybeSingle();

        if (teamErr) {
          console.error('❌ [AUTH] Error obteniendo team:', teamErr);
          if (mounted) {
            setCurrentTeam(null);
            setTeamRole(mem.role as Role);
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        if (team) {
          console.log('✅ [AUTH] Team encontrado:', team.name);
          setCurrentTeam(team as TeamLite);
          setTeamRole(mem.role as Role);
        } else {
          console.log('⚠️ [AUTH] Team no encontrado');
          setCurrentTeam(null);
          setTeamRole(null);
        }

        setLoading(false);

      } catch (error: any) {
        console.error('💥 [AUTH] Error crítico en inicialización:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    }

    init();

    // Escuchar cambios en autenticación
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      console.log('🔔 [AUTH] Estado de auth cambió:', event);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProfile(null);
        setCurrentTeam(null);
        setTeamRole(null);
        setIsSuperAdmin(false);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        init();
      }
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
      userProfile,
      currentTeam, 
      teamRole,
      isSuperAdmin
    }),
    [loading, user, userProfile, currentTeam, teamRole, isSuperAdmin]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
