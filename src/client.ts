import { httpGet, httpPost } from './http.js';
import { getVqdToken, DDG_HEADERS } from './vqd.js';
import { DdgApiError } from './errors.js';

// ─── Re-export DdgApiError ─────────────────────────────────────────────
export { DdgApiError } from './errors.js';

// ─── Rate limiting ────────────────────────────────────────────────────

let lastRequestTime = 0;
const MIN_GAP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_GAP_MS) {
    await sleep(MIN_GAP_MS - elapsed);
  }
  lastRequestTime = Date.now();
}

/** Reset the rate limiter — exposed for testing. */
export function resetRateLimit(): void {
  lastRequestTime = 0;
}

// ─── ddgGet ───────────────────────────────────────────────────────────

/**
 * Generic DDG API GET request.
 * Automatically attaches VQD token and browser headers.
 * Retries on network errors only (not on 4xx/5xx).
 *
 * @param endpoint - API endpoint (e.g. "links.duckduckgo.com/d.js")
 * @param params - Query parameters including "q" (search query)
 * @param options - Optional: maxRetries (default 2), region
 */
export async function ddgGet<T>(
  endpoint: string,
  params: Record<string, string>,
  options?: { maxRetries?: number; region?: string },
): Promise<T> {
  const query = params.q ?? '';
  const vqd = await getVqdToken(query, { region: options?.region });
  const maxRetries = options?.maxRetries ?? 2;

  // Build URL
  const searchParams = new URLSearchParams(params);
  searchParams.set('q', query);
  searchParams.set('vqd', vqd);
  searchParams.set('o', 'json');
  const url = `https://${endpoint}?${searchParams.toString()}`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await enforceRateLimit();

      const response = await httpGet(url, DDG_HEADERS, 15000);

      if (response.status < 200 || response.status >= 300) {
        throw new DdgApiError(
          `HTTP ${response.status}: ${response.body.slice(0, 200)}`,
          response.status,
          response.body,
        );
      }

      try {
        return JSON.parse(response.body) as T;
      } catch {
        throw new DdgApiError(
          `Failed to parse JSON response: ${response.body.slice(0, 200)}`,
          response.status,
          response.body,
        );
      }
    } catch (err) {
      // DdgApiError (4xx/5xx) — do not retry
      if (err instanceof DdgApiError) {
        throw err;
      }

      // Network error — retry if attempts remain
      if (attempt < maxRetries) {
        await sleep(200 * (attempt + 1)); // Simple backoff
      }

      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new DdgApiError(
    `Request failed after ${maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`,
  );
}

// ─── ddgPost ──────────────────────────────────────────────────────────

/**
 * Generic DDG API POST request.
 * Body is JSON. Attaches VQD token and browser headers.
 *
 * @param endpoint - API endpoint (e.g. "duckduckgo.com/qna")
 * @param query - Search query (used for VQD and URL)
 * @param body - JSON body for the POST request
 * @param options - Optional: signal ('low' | 'high'), region
 */
export async function ddgPost<T>(
  endpoint: string,
  query: string,
  body: Record<string, unknown>,
  options?: { signal?: 'low' | 'high'; region?: string },
): Promise<T> {
  const vqd = await getVqdToken(query, { region: options?.region });
  const signal = options?.signal ?? 'low';

  // Build URL
  const url = `https://${endpoint}?q=${encodeURIComponent(query)}&vqd=${vqd}&signal=${signal}&upgradable=0`;

  await enforceRateLimit();

  const response = await httpPost(
    url,
    JSON.stringify(body),
    {
      ...DDG_HEADERS,
      'Content-Type': 'application/json',
    },
    15000,
  );

  if (response.status < 200 || response.status >= 300) {
    throw new DdgApiError(
      `HTTP ${response.status}: ${response.body.slice(0, 200)}`,
      response.status,
      response.body,
    );
  }

  try {
    return JSON.parse(response.body) as T;
  } catch {
    throw new DdgApiError(
      `Failed to parse JSON response: ${response.body.slice(0, 200)}`,
      response.status,
      response.body,
    );
  }
}
