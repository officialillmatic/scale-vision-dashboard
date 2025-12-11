// src/hooks/useSuperAdmin.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const useSuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('🔍 [useSuperAdmin] Checking user:', user?.email)
        
        setUser(user)
        
        if (user) {
          // 🔥 CRÍTICO: Consultar la tabla super_admins (fuente de verdad)
          const { data: superAdminData, error: superErr } = await supabase
            .from('super_admins')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

          if (superErr) {
            console.error('❌ [useSuperAdmin] Error checking super_admins:', superErr)
            setIsSuperAdmin(false)
          } else {
            const isSuper = !!superAdminData
            console.log('🔍 [useSuperAdmin] Is super admin:', isSuper)
            setIsSuperAdmin(isSuper)
          }
        } else {
          console.log('🔍 [useSuperAdmin] No user')
          setIsSuperAdmin(false)
        }
      } catch (error) {
        console.error('❌ [useSuperAdmin] Exception:', error)
        setUser(null)
        setIsSuperAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // 🔧 Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [useSuperAdmin] Auth change:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          
          // Verificar en super_admins
          const { data: superAdminData, error: superErr } = await supabase
            .from('super_admins')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (superErr) {
            console.error('❌ [useSuperAdmin] Error in auth change:', superErr)
            setIsSuperAdmin(false)
          } else {
            setIsSuperAdmin(!!superAdminData)
          }
        } else {
          setUser(null)
          setIsSuperAdmin(false)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 🔧 BACKWARDS COMPATIBILITY: Mantener las mismas propiedades que antes
  return { 
    isSuperAdmin, 
    isLoading,
    // Alias para compatibilidad
    isSuper: isSuperAdmin,
    loading: isLoading,
    user 
  }
}
