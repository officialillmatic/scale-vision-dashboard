
import { useState, useEffect } from 'react'
import { emergencySupabase } from '@/integrations/supabase/emergency-client'

// 🚨 Emergency Super Admin Hook
const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com'
]

export const useEmergencySuperAdmin = () => {
  const [user, setUser] = useState<any>(null)
  const [isSuper, setIsSuper] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await emergencySupabase.auth.getUser()
        
        console.log('🚨 Emergency: Checking user:', user?.email)
        
        setUser(user)
        
        if (user) {
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(
            user.email?.toLowerCase() ?? ''
          )
          const isSuperFromUserMetadata = user.user_metadata?.role === 'super_admin'
          const isSuperFromAppMetadata = user.app_metadata?.role === 'super_admin'
          
          const finalIsSuper = isSuperFromEmail || isSuperFromUserMetadata || isSuperFromAppMetadata
          
          console.log('🚨 Emergency: Is super admin:', finalIsSuper)
          setIsSuper(finalIsSuper)
        } else {
          setIsSuper(false)
        }
      } catch (error) {
        console.error('🚨 Emergency: Error:', error)
        setUser(null)
        setIsSuper(false)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = emergencySupabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🚨 Emergency: Auth change:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          const finalIsSuper = 
            SUPER_ADMIN_EMAILS.includes(session.user.email?.toLowerCase() ?? '') ||
            session.user.user_metadata?.role === 'super_admin' ||
            session.user.app_metadata?.role === 'super_admin'
          setIsSuper(finalIsSuper)
        } else {
          setUser(null)
          setIsSuper(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { 
    user,
    isSuper, 
    loading
  }
}
