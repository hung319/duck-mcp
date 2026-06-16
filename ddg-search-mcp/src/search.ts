import { ddgGet, DdgApiError } from './client.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  hostname: string;
}

export interface SearchOptions {
  maxResults?: number; // default 10
  region?: string;     // default 'wt-wt'
}

// ─── Internal types for raw DDG response ───────────────────────────────

interface RawDdgResult {
  t?: string; // title
  u?: string; // url
  a?: string; // description / abstract
  s?: string; // source / hostname
}

// ─── webSearch ──────────────────────────────────────────────────────────

/**
 * Web search via DuckDuckGo d.js endpoint.
 * Returns organic results (title, url, description, hostname).
 */
export async function webSearch(
  query: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  const maxResults = options?.maxResults ?? 10;

  let rawResults: RawDdgResult[] | null | undefined;
  try {
    rawResults = await ddgGet<RawDdgResult[]>(
      'links.duckduckgo.com/d.js',
      { q: trimmedQuery, p: '1' },
      options?.region ? { region: options.region } : undefined,
    );
  } catch (err) {
    if (err instanceof DdgApiError) {
      throw err;
    }
    throw new DdgApiError(
      `Search request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!Array.isArray(rawResults) || rawResults.length === 0) {
    return [];
  }

  return rawResults
    .filter((r): r is RawDdgResult & { u: string } => typeof r.u === 'string' && r.u.length > 0)
    .slice(0, maxResults)
    .map((r) => ({
      title: r.t ?? '',
      url: r.u,
      description: r.a ?? '',
      hostname: r.s ?? '',
    }));
}
