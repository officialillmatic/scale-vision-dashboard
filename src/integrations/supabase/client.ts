// src/integrations/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseSingleton__: SupabaseClient | undefined;
}

/** Read public (vite) env safely in the browser */
function getPublicSupabaseEnv() {
  const url =
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof window !== 'undefined' ? (window as any).VITE_SUPABASE_URL : '') ||
    '';
  const anon =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' ? (window as any).VITE_SUPABASE_ANON_KEY : '') ||
    '';
  return { url, anon };
}

/** Keep backward-compat for places like LoginForm.tsx */
export function hasValidSupabaseCredentials(): boolean {
  const { url, anon } = getPublicSupabaseEnv();
  return Boolean(
    url &&
      anon &&
      url.startsWith('https://') &&
      // anon keys are long JWT strings; length check avoids empty placeholders
      anon.length > 30
  );
}

/** Single Supabase browser client to avoid "Multiple GoTrueClient" warning */
function getClient(): SupabaseClient {
  if (globalThis.__supabaseSingleton__) return globalThis.__supabaseSingleton__;

  const { url, anon } = getPublicSupabaseEnv();
  if (!url || !anon) {
    // Do not throw synchronously in production builds if some code imports this file early.
    // But log a clear error so env issues are obvious.
    console.error(
      '[supabase] Missing env. Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    );
    throw new Error('Missing Supabase client env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }

  const client = createClient(url, anon, {
    auth: {
      storageKey: 'drscale-auth', // unique namespace for your app
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  globalThis.__supabaseSingleton__ = client;
  return client;
}

export const supabase = getClient();
