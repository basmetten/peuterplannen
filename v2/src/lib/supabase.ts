import { createClient } from '@supabase/supabase-js';
import 'server-only';

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    global: {
      fetch: fetchWithRetry,
    },
  },
);

/** Fetch wrapper with retry for transient failures (502, 503, network errors). */
function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  async function attempt(n: number): Promise<Response> {
    try {
      const res = await fetch(input, init);
      if (res.status >= 500 && n < MAX_RETRIES) {
        console.warn(`Supabase ${res.status} — retry ${n + 1}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY * (n + 1)));
        return attempt(n + 1);
      }
      return res;
    } catch (err) {
      if (n < MAX_RETRIES) {
        console.warn(`Supabase network error — retry ${n + 1}/${MAX_RETRIES}:`, err);
        await new Promise(r => setTimeout(r, RETRY_DELAY * (n + 1)));
        return attempt(n + 1);
      }
      throw err;
    }
  }

  return attempt(0);
}
