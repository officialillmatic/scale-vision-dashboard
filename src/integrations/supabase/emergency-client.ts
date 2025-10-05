import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const emergencySupabaseUrl =
  import.meta.env.VITE_EMERGENCY_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const emergencySupabaseAnonKey =
  import.meta.env.VITE_EMERGENCY_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!emergencySupabaseUrl || !emergencySupabaseAnonKey) {
  throw new Error('Missing emergency Supabase environment variables')
}

export const emergencySupabase = createClient<Database>(
  emergencySupabaseUrl,
  emergencySupabaseAnonKey,
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
