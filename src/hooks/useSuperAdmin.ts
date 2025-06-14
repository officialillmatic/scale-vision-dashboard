import { debugLog } from "@/lib/debug";

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
        
        debugLog('🔍 useSuperAdmin - Checking user:', user?.email)
        debugLog('🔍 useSuperAdmin - User metadata:', user?.user_metadata)
        debugLog('🔍 useSuperAdmin - App metadata:', user?.app_metadata)
        
        setUser(user)
        
        if (user) {
          // 🚨 CORREGIR: Usar user_metadata y app_metadata correctamente
          const isSuperFromUserMetadata = user.user_metadata?.role === 'super_admin'
          const isSuperFromAppMetadata = user.app_metadata?.role === 'super_admin'
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(user.email)
          
          const finalIsSuper = isSuperFromUserMetadata || isSuperFromAppMetadata || isSuperFromEmail
          
          debugLog('🔍 useSuperAdmin - From user metadata:', isSuperFromUserMetadata)
          debugLog('🔍 useSuperAdmin - From app metadata:', isSuperFromAppMetadata)
          debugLog('🔍 useSuperAdmin - From email:', isSuperFromEmail)
          debugLog('🔍 useSuperAdmin - Final Result:', finalIsSuper)
          
          setIsSuperAdmin(finalIsSuper)
        } else {
          debugLog('🔍 useSuperAdmin - No user')
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
        debugLog('🔍 useSuperAdmin - Auth change:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          const finalIsSuper = 
            session.user.user_metadata?.role === 'super_admin' ||
            session.user.app_metadata?.role === 'super_admin' ||
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
