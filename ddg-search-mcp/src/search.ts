import { ddgGet, DdgApiError } from './client.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  hostname: string;
}

export interface SearchOptions {
  maxResults?: number;
  region?: string;
  safesearch?: 'on' | 'moderate' | 'off';
  timeFilter?: 'day' | 'week' | 'month' | 'year';
}

// ─── Internal types for raw DDG response ───────────────────────────────

interface RawDdgResult {
  t?: string; // title
  u?: string; // url
  a?: string; // description / abstract
  s?: string; // source / hostname
}

// ─── Helpers ───────────────────────────────────────────────────────────

const SAFESEARCH_MAP: Record<string, string> = {
  on: '1',
  moderate: '-1',
  off: '-2',
};

const TIMEFILTER_MAP: Record<string, string> = {
  day: 'd',
  week: 'w',
  month: 'm',
  year: 'y',
};

// ─── webSearch ──────────────────────────────────────────────────────────

/**
 * Web search via DuckDuckGo d.js endpoint.
 * Returns organic results (title, url, description, hostname).
 *
 * @param query - Search query
 * @param options - Optional: maxResults, region, safesearch, timeFilter
 */
export async function webSearch(
  query: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  const maxResults = options?.maxResults ?? 10;

  // Build query parameters
  const params: Record<string, string> = {
    q: trimmedQuery,
    p: '1', // default safesearch = moderate
  };

  if (options?.safesearch) {
    params.p = SAFESEARCH_MAP[options.safesearch];
  }
  if (options?.timeFilter) {
    params.df = TIMEFILTER_MAP[options.timeFilter];
  }

  let rawResults: RawDdgResult[] | null | undefined;
  try {
    rawResults = await ddgGet<RawDdgResult[]>(
      'links.duckduckgo.com/d.js',
      params,
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
