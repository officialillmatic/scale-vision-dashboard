// src/integrations/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseSingleton__: SupabaseClient | undefined;
}

/**
 * Single Supabase client for the whole app (prevents "Multiple GoTrueClient" warning).
 * Uses Vite env vars on the client. Make sure these are set in Vercel with the VITE_ prefix.
 */
function getClient(): SupabaseClient {
  if (globalThis.__supabaseSingleton__) return globalThis.__supabaseSingleton__;

  // Client-side keys MUST come from the Vite prefix or similar public injection.
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    (window as any).VITE_SUPABASE_URL || // optional fallback if you inject via script
    '';
  const anon =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (window as any).VITE_SUPABASE_ANON_KEY ||
    '';

  if (!url || !anon) {
    console.error(
      '[supabase] Missing env. Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    );
    throw new Error('Missing Supabase client env');
  }

  const client = createClient(url, anon, {
    auth: {
      storageKey: 'drscale-auth', // unique to your app
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  globalThis.__supabaseSingleton__ = client;
  return client;
}

export const supabase = getClient();
