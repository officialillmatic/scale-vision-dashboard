import { createClient } from '@supabase/supabase-js'

// 🚨 USAR LAS MISMAS CREDENCIALES QUE FUNCIONAN EN EMERGENCY
const supabaseUrl = 'https://jqkkhwoybcenxqpvodev.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8'

// 🔧 DEBUGGING
console.log('🔧 Fixed Supabase Client:')
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey?.substring(0, 20) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'scale-vision-dashboard-fixed',
    },
  },
})

// 🧪 TEST inmediato
supabase.auth.getUser().then(({ data, error }) => {
  console.log('🔧 Fixed client auth test:', data?.user?.email, error)
})

supabase.from('user_profiles').select('id').limit(1).then(({ data, error }) => {
  console.log('🔧 Fixed client query test:', data?.length || 0, 'records', error?.message || 'no error')
})