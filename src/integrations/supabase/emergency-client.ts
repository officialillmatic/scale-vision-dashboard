import { createClient } from '@supabase/supabase-js'

// Use environment variables to create an emergency Supabase client
const EMERGENCY_SUPABASE_URL = process.env.EMERGENCY_SUPABASE_URL || process.env.SUPABASE_URL || ''
const EMERGENCY_SUPABASE_ANON_KEY = process.env.EMERGENCY_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

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

export { emergencySupabase }
