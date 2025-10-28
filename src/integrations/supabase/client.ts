// src/integrations/supabase/client.ts
import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'; // or '@supabase/supabase-js' if you’re not using ssr helpers

declare global {
  // eslint-disable-next-line no-var
  var __supabaseSingleton__: SupabaseClient | undefined;
}

/**
 * Avoid multiple GoTrueClient instances in the same tab.
 * Reuse a single Supabase client across HMR reloads and re-mounts.
 */
function getClient(): SupabaseClient {
  if (globalThis.__supabaseSingleton__) return globalThis.__supabaseSingleton__;

  const url = import.meta.env.VITE_SUPABASE_URL || (window as any).SUPABASE_URL || process.env.SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any).SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('[supabase] Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    throw new Error('Missing Supabase env');
  }

  const client = createBrowserClient(url, anon, {
    auth: {
      storageKey: 'drscale-auth', // unique key so extensions/other apps don’t collide
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  globalThis.__supabaseSingleton__ = client;
  return client;
}

export const supabase = getClient();
