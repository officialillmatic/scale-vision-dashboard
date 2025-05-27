
// Configuration and environment variables for sync-calls function

export interface SyncConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  retellApiKey: string;
  retellApiBaseUrl: string;
}

export function loadSyncConfig(): SyncConfig {
  const supabaseUrl = Deno?.env?.get?.('SUPABASE_URL');
  const supabaseServiceKey = Deno?.env?.get?.('SUPABASE_SERVICE_ROLE_KEY');
  const retellApiKey = Deno?.env?.get?.('RETELL_API_KEY');
  const retellApiBaseUrl = Deno.env.get('RETELL_API_BASE_URL') || 'https://api.retellai.com/v2';

  if (!supabaseUrl) throw new Error('⚠️  Missing required env var: SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('⚠️  Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  if (!retellApiKey) throw new Error('⚠️  Missing required env var: RETELL_API_KEY');

  return {
    supabaseUrl,
    supabaseServiceKey,
    retellApiKey,
    retellApiBaseUrl
  };
}

export const SYNC_CONSTANTS = {
  BATCH_SIZE: 50,
  RATE_LIMIT_DELAY: 200,
  TEST_LIMIT: 1
} as const;
