export interface VqdOptions {
  region?: string;
}

/** Browser-like headers for DuckDuckGo requests. Shared across the project. */
export const DDG_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://duckduckgo.com",
  Referer: "https://duckduckgo.com/",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  "Content-Type": "application/x-www-form-urlencoded",
};

const DDG_URL = "https://duckduckgo.com/";

interface CacheEntry {
  token: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildCacheKey(query: string, region: string): string {
  return `${query}:${region}`;
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

class VqdAcquisitionError extends Error {
  constructor() {
    super("Failed to acquire VQD token");
    this.name = "VqdAcquisitionError";
  }
}

async function fetchVqdToken(query: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(DDG_URL, {
      method: "POST",
      headers: DDG_HEADERS,
      body: `q=${encodeURIComponent(query)}`,
    });
  } catch {
    // Network error — rethrow as-is so retry logic catches it
    throw new Error("Network error");
  }

  if (res.status === 403 || res.status === 429) {
    throw new VqdAcquisitionError();
  }

  const token = res.headers.get("x-vqd-4");
  if (!token) {
    throw new VqdAcquisitionError();
  }

  return token;
}

async function fetchWithRetry(query: string): Promise<string> {
  const delays = [200, 500];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fetchVqdToken(query);
    } catch (err) {
      // Non-retryable: DDG block (403/429) or missing header
      if (err instanceof VqdAcquisitionError) {
        throw err;
      }
      // Network error — retry if attempts remain
      if (attempt === delays.length) {
        throw new VqdAcquisitionError();
      }
      await sleep(delays[attempt]);
    }
  }

  throw new VqdAcquisitionError();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clear the in-memory VQD token cache. Useful for testing. */
export function resetVqdCache(): void {
  cache.clear();
}

export async function getVqdToken(
  query: string,
  options?: VqdOptions
): Promise<string> {
  const region = options?.region ?? "wt-wt";
  const key = buildCacheKey(query, region);

  const cached = cache.get(key);
  if (cached && !isExpired(cached)) {
    return cached.token;
  }

  const token = await fetchWithRetry(query);

  cache.set(key, { token, expiresAt: Date.now() + TTL_MS });
  return token;
}
