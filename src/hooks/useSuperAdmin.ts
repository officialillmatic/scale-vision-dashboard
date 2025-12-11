import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * ✅ HOOK CORREGIDO - useSuperAdmin
 * 
 * CAMBIOS CRÍTICOS:
 * 1. Ahora consulta la tabla 'super_admins' en Supabase (NO metadata)
 * 2. Verifica usando la función is_super_admin() que ya está en la BD
 * 3. Mantiene compatibilidad con código existente
 * 
 * IMPORTANTE: Este hook consulta la tabla super_admins que contiene:
 * - user_id: 6a9d19a4-0633-4a27-98b5-d009875225c1 (produpublicol@gmail.com)
 */

export const useSuperAdmin = () => {
  const [user, setUser] = useState<any>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Función para verificar si un usuario es super admin consultando la tabla
  const checkSuperAdmin = async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 [useSuperAdmin] Verificando super admin para:', userId)
      
      // ✅ MÉTODO 1: Consultar directamente la tabla super_admins
      const { data: superAdminRecord, error } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('❌ [useSuperAdmin] Error consultando super_admins:', error)
        
        // Si hay error de permisos, intentar con la función RPC
        console.log('🔄 [useSuperAdmin] Intentando con función is_super_admin()...')
        const { data: isSuperRPC, error: rpcError } = await supabase
          .rpc('is_super_admin')
        
        if (rpcError) {
          console.error('❌ [useSuperAdmin] Error en RPC is_super_admin:', rpcError)
          return false
        }
        
        console.log('✅ [useSuperAdmin] Resultado RPC:', isSuperRPC)
        return !!isSuperRPC
      }

      const isSuper = !!superAdminRecord
      console.log(isSuper 
        ? '✅ [useSuperAdmin] ¡Usuario ES SUPER ADMIN!' 
        : '❌ [useSuperAdmin] Usuario NO es super admin'
      )
      
      return isSuper

    } catch (error) {
      console.error('💥 [useSuperAdmin] Excepción verificando super admin:', error)
      return false
    }
  }

  useEffect(() => {
    let mounted = true

    const initUser = async () => {
      try {
        setIsLoading(true)
        
        // Obtener usuario actual
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('❌ [useSuperAdmin] Error obteniendo usuario:', error)
          if (mounted) {
            setUser(null)
            setIsSuperAdmin(false)
            setIsLoading(false)
          }
          return
        }

        console.log('👤 [useSuperAdmin] Usuario obtenido:', currentUser?.email)
        
        if (!mounted) return

        if (currentUser) {
          setUser(currentUser)
          
          // Verificar si es super admin
          const isSuper = await checkSuperAdmin(currentUser.id)
          
          if (mounted) {
            setIsSuperAdmin(isSuper)
            
            if (isSuper) {
              console.log('🔥 [useSuperAdmin] Usuario confirmado como SUPER ADMIN')
              console.log('🔥 [useSuperAdmin] Email:', currentUser.email)
              console.log('🔥 [useSuperAdmin] User ID:', currentUser.id)
            }
          }
        } else {
          console.log('❌ [useSuperAdmin] No hay usuario autenticado')
          if (mounted) {
            setUser(null)
            setIsSuperAdmin(false)
          }
        }

      } catch (error) {
        console.error('💥 [useSuperAdmin] Excepción en initUser:', error)
        if (mounted) {
          setUser(null)
          setIsSuperAdmin(false)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initUser()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 [useSuperAdmin] Auth state change:', event)
        
        if (!mounted) return

        if (session?.user) {
          console.log('👤 [useSuperAdmin] Sesión actualizada:', session.user.email)
          setUser(session.user)
          
          const isSuper = await checkSuperAdmin(session.user.id)
          
          if (mounted) {
            setIsSuperAdmin(isSuper)
          }
        } else {
          console.log('❌ [useSuperAdmin] Sesión cerrada')
          if (mounted) {
            setUser(null)
            setIsSuperAdmin(false)
          }
        }
        
        if (mounted) {
          setIsLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Retornar con múltiples alias para compatibilidad
  return { 
    isSuperAdmin,
    isLoading,
    user,
    // Alias para compatibilidad con código existente
    isSuper: isSuperAdmin,
    loading: isLoading,
  }
}
