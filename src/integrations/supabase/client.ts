import { createClient } from '@supabase/supabase-js'

// 🚨 SOLUCIÓN: Usar credenciales que SABEMOS que funcionan
// En lugar de depender de variables de entorno que pueden fallar

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jqkkhwoybcenxqpvodev.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxa2tod295YmNlbnhxcHZvZGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDk4MzksImV4cCI6MjA2MzE4NTgzOX0._CudusgLYlJEv_AkJNGpjavmZNTqxXy4lvAv4laAGd8'

// 🔧 DEBUGGING: Ver qué valores se están usando
console.log('🔍 Supabase Client Debug:')
console.log('URL from env:', import.meta.env.VITE_SUPABASE_URL)
console.log('Key from env:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
console.log('Final URL:', supabaseUrl)
console.log('Final Key:', supabaseAnonKey?.substring(0, 20) + '...')

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

// 🧪 TEST inmediato al cargar
supabase.auth.getUser().then(({ data, error }) => {
  console.log('🚨 Fixed Supabase client test:', data?.user?.email, error)
})

// 🔧 TEST de consulta básica
supabase.from('profiles').select('id').limit(1).then(({ data, error }) => {
  console.log('🚨 Fixed client query test:', data?.length || 0, 'records', error?.message || 'no error')
})