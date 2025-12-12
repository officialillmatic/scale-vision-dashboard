export async function safeSupabaseRequest<T>(promise: Promise<{ data: T; error: any }>): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await promise;
    if (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
    }
    return { data: data ?? null, error: null };
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      return { data: null, error: new Error('Failed to reach Supabase. Check your network connection and environment variables.') };
    }
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
