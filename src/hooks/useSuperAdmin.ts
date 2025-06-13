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
    let mounted = true // Evitar race conditions

    const checkSuperAdmin = (user) => {
      if (!user || !user.email) return false
      
      const isSuperFromMetadata = user.user_metadata?.role === 'super_admin'
      const isSuperFromRawMetadata = user.raw_user_meta_data?.role === 'super_admin'
      const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(user.email)
      
      return isSuperFromMetadata || isSuperFromRawMetadata || isSuperFromEmail
    }

    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('🔧 useSuperAdmin STABLE - Checking user:', user?.email)
        
        if (mounted) {
          setUser(user)
          const isSuper = checkSuperAdmin(user)
          setIsSuperAdmin(isSuper)
          setIsLoading(false)
          
          console.log('🔧 useSuperAdmin STABLE - Final Result:', isSuper)
        }
        
      } catch (error) {
        console.error('🔧 useSuperAdmin STABLE - Error:', error)
        if (mounted) {
          setUser(null)
          setIsSuperAdmin(false)
          setIsLoading(false)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔧 useSuperAdmin STABLE - Auth change:', event, session?.user?.email)
        
        if (mounted) {
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
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { 
    isSuperAdmin, 
    isLoading,
    user 
  }
}