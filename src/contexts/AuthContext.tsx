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
    console.log('🔍 [checkSuperAdmin] START - userId:', userId);
    
    const { data: superAdminRecord, error } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('🔍 [checkSuperAdmin] Query result:', { data: superAdminRecord, error });

    if (error) {
      console.error('❌ [checkSuperAdmin] Error:', error);
      
      // Fallback: intentar con RPC
      console.log('🔄 [checkSuperAdmin] Intentando RPC is_super_admin()...');
      const { data: isSuperRPC, error: rpcError } = await supabase.rpc('is_super_admin');
      
      console.log('🔍 [checkSuperAdmin] RPC result:', { data: isSuperRPC, error: rpcError });
      
      if (rpcError) {
        console.error('❌ [checkSuperAdmin] RPC Error:', rpcError);
        return false;
      }
      
      return !!isSuperRPC;
    }

    const isSuper = !!superAdminRecord;
    console.log(isSuper 
      ? '✅ [checkSuperAdmin] ES SUPER ADMIN' 
      : '❌ [checkSuperAdmin] NO es super admin'
    );
    
    return isSuper;

  } catch (error) {
    console.error('💥 [checkSuperAdmin] Excepción:', error);
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
        console.log('🚀 [AuthContext.init] START');
        setLoading(true);
        
        // PASO 1: Obtener usuario
        console.log('📋 [AuthContext.init] PASO 1: getUser()...');
        const { data: auth } = await supabase.auth.getUser();
        const u = auth?.user ?? null;
        console.log('📋 [AuthContext.init] PASO 1: Usuario obtenido:', u?.email || 'NULL');
        
        if (!mounted) {
          console.log('⚠️ [AuthContext.init] Component unmounted, aborting');
          return;
        }

        setUser(u);

        if (!u) {
          console.log('❌ [AuthContext.init] No hay usuario autenticado');
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        console.log('👤 [AuthContext.init] Usuario autenticado:', u.email);
        console.log('👤 [AuthContext.init] User ID:', u.id);

        // PASO 2: Verificar super admin
        console.log('📋 [AuthContext.init] PASO 2: Verificando super admin...');
        const isSuper = await checkSuperAdmin(u.id);
        console.log('📋 [AuthContext.init] PASO 2: Resultado super admin:', isSuper);
        
        if (!mounted) {
          console.log('⚠️ [AuthContext.init] Component unmounted, aborting');
          return;
        }
        
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          console.log('🔥 [AuthContext.init] SUPER ADMIN detectado - acceso total concedido');
          console.log('🔥 [AuthContext.init] Email:', u.email);
          console.log('🔥 [AuthContext.init] User ID:', u.id);
        }

        // PASO 3: Cargar team (con manejo de errores exhaustivo)
        console.log('📋 [AuthContext.init] PASO 3: Consultando team_members...');
        
        try {
          const { data: mem, error: memErr } = await supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', u.id)
            .limit(1)
            .maybeSingle();

          console.log('📋 [AuthContext.init] PASO 3: team_members result:', { data: mem, error: memErr });

          if (memErr) {
            console.warn('⚠️ [AuthContext.init] PASO 3: Error en team_members:', memErr);
            
            if (isSuper) {
              console.log('ℹ️ [AuthContext.init] Super admin sin team (OK - tiene acceso total)');
            } else {
              console.warn('⚠️ [AuthContext.init] Usuario normal con error en team_members');
            }
            
            setCurrentTeam(null);
            setTeamRole(null);
            setLoading(false);
            console.log('✅ [AuthContext.init] COMPLETADO (sin team, con error)');
            return;
          }

          if (!mem) {
            console.log('📋 [AuthContext.init] PASO 3: No hay team_member para este usuario');
            
            if (isSuper) {
              console.log('ℹ️ [AuthContext.init] Super admin sin team asignado (OK)');
            } else {
              console.log('⚠️ [AuthContext.init] Usuario normal sin team');
            }
            
            setCurrentTeam(null);
            setTeamRole(null);
            setLoading(false);
            console.log('✅ [AuthContext.init] COMPLETADO (sin team)');
            return;
          }

          // PASO 4: Cargar datos del team
          console.log('📋 [AuthContext.init] PASO 4: Consultando teams...');
          console.log('📋 [AuthContext.init] PASO 4: team_id:', mem.team_id);
          
          const { data: team, error: teamErr } = await supabase
            .from('teams')
            .select('id, name, seat_limit')
            .eq('id', mem.team_id)
            .single();

          console.log('📋 [AuthContext.init] PASO 4: teams result:', { data: team, error: teamErr });

          if (teamErr) {
            console.warn('⚠️ [AuthContext.init] PASO 4: Error en teams:', teamErr);
            setCurrentTeam(null);
            setTeamRole(mem.role as Role);
            setLoading(false);
            console.log('✅ [AuthContext.init] COMPLETADO (sin team data, con error)');
            return;
          }

          console.log('✅ [AuthContext.init] PASO 4: Team cargado:', team.name);
          setCurrentTeam(team as TeamLite);
          setTeamRole(mem.role as Role);
          setLoading(false);
          console.log('✅ [AuthContext.init] COMPLETADO (con team)');
          
        } catch (teamError) {
          console.error('💥 [AuthContext.init] Excepción en PASO 3/4:', teamError);
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
          console.log('✅ [AuthContext.init] COMPLETADO (excepción capturada)');
        }

      } catch (error) {
        console.error('💥 [AuthContext.init] Excepción general:', error);
        if (mounted) {
          setLoading(false);
        }
        console.log('❌ [AuthContext.init] FALLIDO');
      }
    }

    console.log('🎬 [AuthContext] useEffect ejecutado - llamando init()');
    init();

    // Listener de cambios de auth
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      console.log('🔔 [AuthContext] Auth state change:', _event);
      
      if (_event === 'SIGNED_IN' && sess?.user) {
        console.log('🔑 [AuthContext] SIGNED_IN detectado, re-inicializando...');
        
        // Pequeña pausa para sincronización
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🔄 [AuthContext] Llamando init() después de SIGNED_IN');
        await init();
        console.log('✅ [AuthContext] init() completado después de SIGNED_IN');
        
      } else if (_event === 'SIGNED_OUT') {
        console.log('🚪 [AuthContext] SIGNED_OUT detectado');
        setUser(null);
        setCurrentTeam(null);
        setTeamRole(null);
        setIsSuperAdmin(false);
        setLoading(false);
        
      } else if (_event === 'TOKEN_REFRESHED') {
        console.log('🔄 [AuthContext] TOKEN_REFRESHED');
        
      } else {
        console.log('🔄 [AuthContext] Otro evento, llamando init()');
        await init();
      }
    });

    return () => {
      console.log('🧹 [AuthContext] Cleanup - desmontando');
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

  // Log de estado final
  useEffect(() => {
    if (!loading && user) {
      console.log('📊 [AuthContext] Estado final:', {
        email: user.email,
        isSuperAdmin,
        hasTeam: !!currentTeam,
        teamRole,
        loading
      });
    }
  }, [loading, user, isSuperAdmin, currentTeam, teamRole]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
