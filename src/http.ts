import { DdgApiError } from './client.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface HttpResponse {
  status: number;
  body: string;
}

// ─── httpGet ────────────────────────────────────────────────────────────

/**
 * Low-level HTTP GET helper.
 *
 * Unlike `ddgGet` in client.ts, this does NOT acquire VQD tokens.
 * Returns the raw response for the caller to validate.
 *
 * @param url - Full URL to fetch
 * @param options - Optional headers and timeout (default 5000ms)
 */
export async function httpGet(
  url: string,
  options?: { headers?: Record<string, string>; timeout?: number },
): Promise<HttpResponse> {
  const timeout = options?.timeout ?? 5000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: options?.headers,
      signal: controller.signal,
    });

    const body = await response.text();
    return { status: response.status, body };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new DdgApiError(`Request timeout after ${timeout}ms`);
    }
    throw new DdgApiError(
      `HTTP request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
