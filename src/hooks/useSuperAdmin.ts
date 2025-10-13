
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Centralized logger: only outputs when VITE_DEBUG_MODE=true.
import { log, warn, error } from '@/utils/logger'

// Super admin configuration
//
// Read super admin identifiers from environment variables rather than
// hard‑coding them. Accepts comma‑separated lists. See docs/ENVIRONMENT_SETUP.md.
const SUPER_ADMIN_EMAILS: string[] = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim())
  .filter(Boolean)

const SUPER_ADMIN_IDS: string[] = (import.meta.env.VITE_SUPER_ADMIN_IDS || '')
  .split(',')
  .map((id: string) => id.trim())
  .filter(Boolean)

export const useSuperAdmin = () => {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error: fetchError } = await supabase.auth.getUser()

        // Debug: log the fetched user and metadata
        log('🔍 useSuperAdmin - Checking user:', user?.email)
        log('🔍 useSuperAdmin - User metadata:', user?.user_metadata)
        log('🔍 useSuperAdmin - App metadata:', user?.app_metadata)

        setUser(user)

        if (user) {
          // Determine super admin status from metadata, email and ID.
          const isSuperFromUserMetadata = user.user_metadata?.role === 'super_admin'
          const isSuperFromAppMetadata = user.app_metadata?.role === 'super_admin'
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(user.email)
          const isSuperFromId = SUPER_ADMIN_IDS.includes(user.id)

          const finalIsSuper =
            isSuperFromUserMetadata ||
            isSuperFromAppMetadata ||
            isSuperFromEmail ||
            isSuperFromId

          // Log the decision matrix
          log('🔍 useSuperAdmin - From user metadata:', isSuperFromUserMetadata)
          log('🔍 useSuperAdmin - From app metadata:', isSuperFromAppMetadata)
          log('🔍 useSuperAdmin - From email:', isSuperFromEmail)
          log('🔍 useSuperAdmin - From id:', isSuperFromId)
          log('🔍 useSuperAdmin - Final Result:', finalIsSuper)

          setIsSuperAdmin(finalIsSuper)
        } else {
          log('🔍 useSuperAdmin - No user')
          setIsSuperAdmin(false)
        }
      } catch (err) {
        error('🔍 useSuperAdmin - Error:', err)
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
        log('🔍 useSuperAdmin - Auth change:', event, session?.user?.email)

        if (session?.user) {
          setUser(session.user)
          const isSuperFromUserMetadata = session.user.user_metadata?.role === 'super_admin'
          const isSuperFromAppMetadata = session.user.app_metadata?.role === 'super_admin'
          const isSuperFromEmail = SUPER_ADMIN_EMAILS.includes(session.user.email)
          const isSuperFromId = SUPER_ADMIN_IDS.includes(session.user.id)
          const finalIsSuper =
            isSuperFromUserMetadata ||
            isSuperFromAppMetadata ||
            isSuperFromEmail ||
            isSuperFromId
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
