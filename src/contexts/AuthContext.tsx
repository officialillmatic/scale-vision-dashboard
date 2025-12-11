// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

type TeamLite = {
  id: string;
  name: string;
  seat_limit: number | null;
};

/**
 * ✅ SessionState ACTUALIZADO - Ahora incluye isSuperAdmin
 */
type SessionState = {
  loading: boolean;
  user: any | null;
  currentTeam: TeamLite | null;
  teamRole: Role | null;
  isSuperAdmin: boolean; // ✅ NUEVO: Detecta super admins
};

const AuthCtx = createContext<SessionState>({
  loading: true,
  user: null,
  currentTeam: null,
  teamRole: null,
  isSuperAdmin: false, // ✅ NUEVO
});

export const useAuth = () => useContext(AuthCtx);

/**
 * ✅ FUNCIÓN PARA VERIFICAR SUPER ADMIN
 * 
 * Consulta la tabla 'super_admins' en Supabase
 * Esta tabla contiene el user_id de super admins autorizados
 */
const checkSuperAdmin = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔍 [AuthContext] Verificando super admin para:', userId)
    
    // Método 1: Consultar tabla super_admins directamente
    const { data: superAdminRecord, error } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('❌ [AuthContext] Error consultando super_admins:', error)
      
      // Fallback: Intentar con función RPC
      console.log('🔄 [AuthContext] Intentando con is_super_admin()...')
      const { data: isSuperRPC, error: rpcError } = await supabase
        .rpc('is_super_admin')
      
      if (rpcError) {
        console.error('❌ [AuthContext] Error en RPC:', rpcError)
        return false
      }
      
      return !!isSuperRPC
    }

    const isSuper = !!superAdminRecord
    
    if (isSuper) {
      console.log('✅ [AuthContext] Usuario ES SUPER ADMIN')
    } else {
      console.log('❌ [AuthContext] Usuario NO es super admin')
    }
    
    return isSuper

  } catch (error) {
    console.error('💥 [AuthContext] Excepción verificando super admin:', error)
    return false
  }
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);
  const [teamRole, setTeamRole] = useState<Role | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // ✅ NUEVO estado

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        
        // 1. Obtener usuario autenticado
        const { data: auth } = await supabase.auth.getUser();
        const u = auth?.user ?? null;
        
        if (!mounted) return;

        setUser(u);

        if (!u) {
          // No hay usuario logueado
          console.log('❌ [AuthContext] No hay usuario autenticado')
          setCurrentTeam(null);
          setTeamRole(null);
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        console.log('👤 [AuthContext] Usuario autenticado:', u.email)

        // 2. ✅ VERIFICAR SI ES SUPER ADMIN (CRÍTICO - HACER PRIMERO)
        const isSuper = await checkSuperAdmin(u.id)
        
        if (!mounted) return;
        
        setIsSuperAdmin(isSuper)

        if (isSuper) {
          console.log('🔥 [AuthContext] SUPER ADMIN detectado - acceso total concedido')
          console.log('🔥 [AuthContext] Email:', u.email)
          console.log('🔥 [AuthContext] User ID:', u.id)
          
          // Super admins tienen acceso total, no necesitan team
          // Pero igual intentamos cargar su team si existe
        }

        // 3. Cargar información de team (para todos los usuarios)
        // ⚠️ IMPORTANTE: No bloquear el login si hay errores de RLS
        try {
          const { data: mem, error: memErr } = await supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', u.id)
            .limit(1)
            .maybeSingle();

          if (memErr) {
            console.warn('[AuthContext] Error leyendo team_members:', memErr);
            // ✅ NO BLOQUEAMOS: Si es super admin o hay error de RLS, continuamos
            if (isSuper) {
              console.log('ℹ️ [AuthContext] Super admin sin team (OK - tiene acceso total)');
            }
            setCurrentTeam(null);
            setTeamRole(null);
            setLoading(false);
            return; // ✅ PERMITIR LOGIN aunque falle team_members
          }

          if (!mem) {
            if (isSuper) {
              console.log('ℹ️ [AuthContext] Super admin sin team asignado (OK)');
            } else {
              console.log('⚠️ [AuthContext] Usuario normal sin team');
            }
            setCurrentTeam(null);
            setTeamRole(null);
            setLoading(false);
            return; // ✅ PERMITIR LOGIN aunque no tenga team
          }

          // 4. Cargar datos del team
          const { data: team, error: teamErr } = await supabase
            .from('teams')
            .select('id, name, seat_limit')
            .eq('id', mem.team_id)
            .single();

          if (teamErr) {
            console.warn('[AuthContext] Error leyendo teams:', teamErr);
            setCurrentTeam(null);
            setTeamRole(mem.role as Role);
            setLoading(false);
            return; // ✅ PERMITIR LOGIN aunque falle teams
          }

          console.log('✅ [AuthContext] Team cargado:', team.name)
          setCurrentTeam(team as TeamLite);
          setTeamRole(mem.role as Role);
          setLoading(false);
          
        } catch (teamError) {
          // ✅ CATCH de seguridad: Si cualquier query de team falla, NO bloqueamos
          console.error('[AuthContext] Excepción cargando team, pero permitiendo login:', teamError);
          setCurrentTeam(null);
          setTeamRole(null);
          setLoading(false);
        }

      } catch (error) {
        console.error('💥 [AuthContext] Error en init():', error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    // Escuchar cambios de autenticación
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      console.log('🔔 [AuthContext] Auth state change:', _event);
      
      // ✅ FIX: Manejar el evento SIGNED_IN explícitamente
      if (_event === 'SIGNED_IN' && sess?.user) {
        console.log('🔑 [AuthContext] SIGNED_IN detectado, re-inicializando...');
        
        // Esperar un momento para asegurar que Supabase haya actualizado la sesión
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Re-ejecutar init
        await init();
      } else if (_event === 'SIGNED_OUT') {
        console.log('🚪 [AuthContext] SIGNED_OUT detectado');
        setUser(null);
        setCurrentTeam(null);
        setTeamRole(null);
        setIsSuperAdmin(false);
        setLoading(false);
      } else if (_event === 'TOKEN_REFRESHED') {
        console.log('🔄 [AuthContext] TOKEN_REFRESHED');
        // No necesitamos hacer nada, el token se actualizó automáticamente
      } else {
        // Para otros eventos, re-ejecutar init por si acaso
        await init();
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // ✅ Refrescar sesión periódicamente
  useEffect(() => {
    if (!user) return;

    // Refrescar sesión cada 50 minutos (los tokens expiran en 60 min)
    const refreshInterval = setInterval(async () => {
      console.log('🔄 [AuthContext] Refrescando sesión...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ [AuthContext] Error refrescando sesión:', error);
      } else {
        console.log('✅ [AuthContext] Sesión refrescada exitosamente');
      }
    }, 50 * 60 * 1000); // 50 minutos

    return () => clearInterval(refreshInterval);
  }, [user]);

  const value = useMemo(
    () => ({ 
      loading, 
      user, 
      currentTeam, 
      teamRole,
      isSuperAdmin // ✅ NUEVO: Exponer isSuperAdmin
    }),
    [loading, user, currentTeam, teamRole, isSuperAdmin]
  );

  // ✅ Log para debugging
  useEffect(() => {
    if (!loading && user) {
      console.log('📊 [AuthContext] Estado actual:', {
        email: user.email,
        isSuperAdmin,
        hasTeam: !!currentTeam,
        teamRole
      });
    }
  }, [loading, user, isSuperAdmin, currentTeam, teamRole]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
