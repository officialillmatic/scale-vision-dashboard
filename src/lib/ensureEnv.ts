
export function env(key: string): string {
  const val = Deno?.env?.get?.(key) ?? process.env[key];
  if (!val) throw new Error(`⚠️  Missing required env var: ${key}`);
  return val;
}
