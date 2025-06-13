import { useState, useEffect } from 'react'
// 🚨 SOLUCIÓN: Usar el cliente supabase directo en lugar de auth-helpers
import { supabase } from '@/integrations/supabase/client'

// 🚨 SOLUCIÓN: Usar la misma lógica que funciona en emergency
const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com'
]

export const useSuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 🔧 Obtener usuario directamente de supabase
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('🔍 useSuperAdmin - Checking user:', user?.email)
        console.log('🔍 useSuperAdmin - User metadata:', user?.user_metadata)
        console.log('🔍 useSuperAdmin - Raw metadata:', user?.raw_user_meta_data)
        
        setUser(user)
        
        if (user) {
          // 🚨 USAR LA MISMA LÓGICA QUE FUNCIONA
          const isSuperFromMetadata = user.user_metadata?.role === 'super_admin'
          const isSuperFromRawMetadata = user.raw_user_meta_data?.role === 'super_admin'
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(user.email)
          
          const finalIsSuper = isSuperFromMetadata || isSuperFromRawMetadata || isSuperFromEmail
          
          console.log('🔍 useSuperAdmin - From metadata:', isSuperFromMetadata)
          console.log('🔍 useSuperAdmin - From raw metadata:', isSuperFromRawMetadata)
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
            session.user.raw_user_meta_data?.role === 'super_admin' ||
            SUPER_ADMIN_EMAILS.includes(session.user.email)
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