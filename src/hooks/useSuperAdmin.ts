// src/hooks/useSuperAdmin.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const useSuperAdmin = () => {
  const [user, setUser] = useState<any>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        setIsLoading(true)
        
        // 1. Obtener usuario autenticado
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('🔴 [useSuperAdmin] Auth error:', authError)
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
          return
        }

        if (!authUser) {
          console.log('⚪ [useSuperAdmin] No authenticated user')
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
          return
        }

        console.log('👤 [useSuperAdmin] Checking user:', authUser.email)
        setUser(authUser)

        // 2. Verificar en tabla super_admins
        const { data: superAdminData, error: superAdminError } = await supabase
          .from('super_admins')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle()

        if (superAdminError) {
          console.error('🔴 [useSuperAdmin] Error checking super_admins:', superAdminError)
          setIsSuperAdmin(false)
          setIsLoading(false)
          return
        }

        const isSuper = !!superAdminData
        
        console.log('🔍 [useSuperAdmin] Super admin check:', {
          user_id: authUser.id,
          email: authUser.email,
          found_in_super_admins: isSuper,
          super_admin_record: superAdminData
        })

        setIsSuperAdmin(isSuper)
        
      } catch (error) {
        console.error('🔴 [useSuperAdmin] Unexpected error:', error)
        setUser(null)
        setIsSuperAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Ejecutar verificación inicial
    checkSuperAdmin()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [useSuperAdmin] Auth state changed:', event)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Re-verificar al iniciar sesión o refrescar token
          await checkSuperAdmin()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { 
    isSuperAdmin, 
    isLoading,
    user,
    // Aliases para compatibilidad
    isSuper: isSuperAdmin,
    loading: isLoading
  }
}
