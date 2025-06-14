
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

// 🚨 SOLUCIÓN: Lista de emails de super admin
const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com'
]

export const useSuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('🔍 useSuperAdmin - Checking user:', user?.email)
        console.log('🔍 useSuperAdmin - User metadata:', user?.user_metadata)
        console.log('🔍 useSuperAdmin - App metadata:', user?.app_metadata)
        
        setUser(user)
        
        if (user) {
          // 🚨 CORREGIR: Usar user_metadata y app_metadata correctamente
          const isSuperFromUserMetadata = user.user_metadata?.role === 'super_admin'
          const isSuperFromAppMetadata = user.app_metadata?.role === 'super_admin'
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(
            user.email?.toLowerCase() ?? ''
          )
          
          const finalIsSuper = isSuperFromUserMetadata || isSuperFromAppMetadata || isSuperFromEmail
          
          console.log('🔍 useSuperAdmin - From user metadata:', isSuperFromUserMetadata)
          console.log('🔍 useSuperAdmin - From app metadata:', isSuperFromAppMetadata)
          console.log('🔍 useSuperAdmin - From email:', isSuperFromEmail)
          console.log('🔍 useSuperAdmin - Final Result:', finalIsSuper)
          
          setIsSuperAdmin(finalIsSuper)
        } else {
          console.log('🔍 useSuperAdmin - No user')
          setIsSuperAdmin(false)
        }
      } catch (error) {
        console.error('🔍 useSuperAdmin - Error:', error)
        setUser(null)
        setIsSuperAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // 🔧 Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔍 useSuperAdmin - Auth change:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          const finalIsSuper = 
            session.user.user_metadata?.role === 'super_admin' ||
            session.user.app_metadata?.role === 'super_admin' ||
            SUPER_ADMIN_EMAILS.includes(session.user.email?.toLowerCase() ?? '')
          setIsSuperAdmin(finalIsSuper)
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
