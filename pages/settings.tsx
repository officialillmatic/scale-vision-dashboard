import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function SettingsAlias(){
  const router = useRouter()
  useEffect(() => { router.replace('/Settings') }, [router])
  return null
}
