import { createClient } from '@supabase/supabase-js';

// Support both Vite-style (VITE_*) and Next-style (NEXT_PUBLIC_*)
const url =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn(
    'Missing Supabase envs. Set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
}

export const supabase = createClient(url!, anon!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
