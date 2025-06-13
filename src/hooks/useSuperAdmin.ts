import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com'
]

export const useSuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSuperAdmin = (user) => {
      if (!user || !user.email) return false
      
      console.log('🔧 Checking super admin for:', user.email)
      console.log('🔧 raw_user_meta_data:', user.raw_user_meta_data)
      console.log('🔧 raw_app_meta_data:', user.raw_app_meta_data)
      
      // ✅ USAR LAS COLUMNAS CORRECTAS QUE SÍ EXISTEN
      const isSuperFromRawUserMeta = user.raw_user_meta_data?.role === 'super_admin'
      const isSuperFromRawAppMeta = user.raw_app_meta_data?.role === 'super_admin'
      const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(user.email)
      
      console.log('🔧 From raw_user_meta_data:', isSuperFromRawUserMeta)
      console.log('🔧 From raw_app_meta_data:', isSuperFromRawAppMeta)
      console.log('🔧 From email:', isSuperFromEmail)
      
      const result = isSuperFromRawUserMeta || isSuperFromRawAppMeta || isSuperFromEmail
      console.log('🔧 Final super admin result:', result)
      
      return result
    }

    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('🔧 useSuperAdmin - Got user:', user?.email)
        
        setUser(user)
        const isSuper = checkSuperAdmin(user)
        setIsSuperAdmin(isSuper)
        setIsLoading(false)
        
      } catch (error) {
        console.error('🔧 useSuperAdmin - Error:', error)
        setUser(null)
        setIsSuperAdmin(false)
        setIsLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔧 Auth change:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          const isSuper = checkSuperAdmin(session.user)
          setIsSuperAdmin(isSuper)
          setIsLoading(false)
        } else {
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
        }
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