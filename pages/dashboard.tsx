import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function DashboardRoute(){
  const router = useRouter()
  useEffect(() => {
    // If someone hits /dashboard on this project, send them to the app root
    router.replace('/')
  }, [router])
  return (
    <main className='min-h-screen grid place-items-center p-10 text-center'>
      <div>
        <p className='opacity-70'>Loading dashboard…</p>
      </div>
    </main>
  )
}
