import { createClient } from '@supabase/supabase-js'

// TUS CREDENCIALES REALES - HARDCODEADAS
const EMERGENCY_SUPABASE_URL = 'https://jqkkhwoybcenxqpvodev.supabase.co'
const EMERGENCY_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8'

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
