import { useState, useEffect } from 'react'
import { useUser } from '@supabase/auth-helpers-react'

// 🚨 SOLUCIÓN: Usar la misma lógica que funciona en emergency
const SUPER_ADMIN_EMAILS = [
  'aiagentsdevelopers@gmail.com',
  'produpublicol@gmail.com'
]

export const useSuperAdmin = () => {
  const user = useUser()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSuperAdmin = () => {
      console.log('🔍 useSuperAdmin - Checking user:', user?.email)
      console.log('🔍 useSuperAdmin - User metadata:', user?.user_metadata)
      console.log('🔍 useSuperAdmin - Raw metadata:', user?.raw_user_meta_data)
      
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
      setIsLoading(false)
    }

    checkSuperAdmin()
  }, [user])

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