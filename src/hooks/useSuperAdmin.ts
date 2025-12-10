// src/hooks/useSuperAdmin.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const useSuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkSuperAdmin = async () => {
      try {
        console.log('🔍 useSuperAdmin - Iniciando verificación...')
        
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('❌ useSuperAdmin - Error de auth:', authError)
          if (mounted) {
            setUser(null)
            setIsSuperAdmin(false)
            setIsLoading(false)
          }
          return
        }

        console.log('✅ useSuperAdmin - Usuario:', user?.email)
        
        if (!mounted) return
        
        setUser(user)
        
        if (!user) {
          console.log('❌ useSuperAdmin - Sin usuario')
          setIsSuperAdmin(false)
          setIsLoading(false)
          return
        }

        // Verificar en la tabla super_admins (fuente de verdad)
        console.log('🔍 useSuperAdmin - Consultando tabla super_admins...')
        
        const { data: superAdminData, error: superAdminError } = await supabase
          .from('super_admins')
          .select('id, user_id, email')
          .eq('user_id', user.id)
          .maybeSingle()

        if (superAdminError && superAdminError.code !== 'PGRST116') {
          console.error('⚠️ useSuperAdmin - Error consultando super_admins:', superAdminError)
        }

        const isSuper = !!superAdminData

        if (!mounted) return

        if (isSuper) {
          console.log('👑 useSuperAdmin - ¡Es SUPER ADMIN!')
        } else {
          console.log('👤 useSuperAdmin - Usuario regular')
        }
        
        setIsSuperAdmin(isSuper)
        setIsLoading(false)

      } catch (error) {
        console.error('💥 useSuperAdmin - Error crítico:', error)
        if (mounted) {
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
        }
      }
    }

    checkSuperAdmin()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 useSuperAdmin - Auth cambió:', event)
        
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          setIsLoading(true)
          
          // Re-verificar en super_admins
          try {
            const { data: superAdminData } = await supabase
              .from('super_admins')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle()

            if (mounted) {
              setIsSuperAdmin(!!superAdminData)
              setIsLoading(false)
            }
          } catch (error) {
            console.error('❌ useSuperAdmin - Error en auth change:', error)
            if (mounted) {
              setIsSuperAdmin(false)
              setIsLoading(false)
            }
          }
        } else {
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Mantener compatibilidad con código existente
  return { 
    isSuperAdmin, 
    isLoading,
    // Alias para compatibilidad
    isSuper: isSuperAdmin,
    loading: isLoading,
    user 
  }
}
