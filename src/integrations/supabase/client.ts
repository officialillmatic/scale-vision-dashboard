
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export const hasValidSupabaseCredentials = () => {
  return !!(supabaseUrl && 
           supabaseAnonKey && 
           supabaseUrl.startsWith('https://') && 
           supabaseUrl.includes('.supabase.co') && 
           !supabaseUrl.includes('your-project-ref') &&
           supabaseAnonKey.startsWith('eyJ') && 
           supabaseAnonKey.length > 100 && 
           !supabaseAnonKey.includes('your-anon-key'))
}
