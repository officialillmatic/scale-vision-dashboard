import { createClient } from '@supabase/supabase-js'

const EMERGENCY_SUPABASE_URL = import.meta.env.VITE_EMERGENCY_SUPABASE_URL
const EMERGENCY_SUPABASE_ANON_KEY = import.meta.env.VITE_EMERGENCY_SUPABASE_ANON_KEY

if (!EMERGENCY_SUPABASE_URL || !EMERGENCY_SUPABASE_ANON_KEY) {
  throw new Error('Missing emergency Supabase environment variables')
}

export const emergencySupabase = createClient(
  EMERGENCY_SUPABASE_URL,
  EMERGENCY_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'emergency-scale-vision',
      },
    },
  }
)

// Test inmediato
emergencySupabase.auth.getUser().then(({ data, error }) => {
  console.log('🚨 Emergency client test:', data?.user?.email, error)
})
