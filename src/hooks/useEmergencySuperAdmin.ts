import { useState, useEffect } from 'react'
import { emergencySupabase } from '@/integrations/supabase/emergency-client'

const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com'
]

export const useEmergencySuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuper, setIsSuper] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get user inmediatamente
    const getUser = async () => {
      try {
        const { data: { user }, error } = await emergencySupabase.auth.getUser()
        
        console.log('🚨 Emergency user check:', user?.email)
        
        setUser(user)
        
        if (user && SUPER_ADMIN_EMAILS.includes(user.email)) {
          setIsSuper(true)
          console.log('🚨 Emergency super admin confirmed:', user.email)
        } else {
          setIsSuper(false)
        }
        
      } catch (error) {
        console.error('🚨 Emergency auth error:', error)
        setUser(null)
        setIsSuper(false)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = emergencySupabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🚨 Emergency auth change:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          setIsSuper(SUPER_ADMIN_EMAILS.includes(session.user.email))
        } else {
          setUser(null)
          setIsSuper(false)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, isSuper, loading }
}
