import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

// 🚨 USAR LA MISMA LÓGICA QUE FUNCIONA EN EMERGENCY
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
        
        console.log('🔧 useSuperAdmin FIXED - Checking user:', user?.email)
        
        setUser(user)
        
        if (user) {
          // 🚨 USAR LA MISMA LÓGICA QUE FUNCIONA
          const isSuperFromMetadata = user.user_metadata?.role === 'super_admin'
          const isSuperFromRawMetadata = user.raw_user_meta_data?.role === 'super_admin'
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(user.email)
          
          const finalIsSuper = isSuperFromMetadata || isSuperFromRawMetadata || isSuperFromEmail
          
          console.log('🔧 useSuperAdmin FIXED - Final Result:', finalIsSuper)
          
          setIsSuperAdmin(finalIsSuper)
        } else {
          setIsSuperAdmin(false)
        }
        
      } catch (error) {
        console.error('🔧 useSuperAdmin FIXED - Error:', error)
        setUser(null)
        setIsSuperAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔧 useSuperAdmin FIXED - Auth change:', event, session?.user?.email)
        
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

  return { 
    isSuperAdmin, 
    isLoading,
    user 
  }
}