// Lightweight retry & concurrency helpers
export function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function withRetries<T>(fn: () => Promise<T>, opts?: { retries?: number; baseDelayMs?: number }) {
  const retries = opts?.retries ?? 3;
  const base = opts?.baseDelayMs ?? 300;
  let lastErr: any;
  for (let i=0;i<=retries;i++){
    try { return await fn() }
    catch (err: any){
      lastErr = err;
      const msg = String(err?.message || err);
      // Only retry on transient network-ish errors
      if (!(/HTTP2|CONNECTION|network|fetch|timeout/i.test(msg))) break;
      await sleep(base * Math.pow(2,i));
    }
  }
  throw lastErr;
}

export function createLimiter(maxConcurrent = 3){
  let active = 0;
  const q: (()=>void)[] = [];
  function next(){ active--; q.shift()?.() }
  return async function run<T>(task: () => Promise<T>): Promise<T>{
    if (active >= maxConcurrent) await new Promise<void>(res => q.push(res));
    active++;
    try { return await task() } finally { next() }
  }
}
