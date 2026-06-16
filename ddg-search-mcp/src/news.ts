import { ddgGet } from './client.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  snippet: string;
  image?: string;
}

export interface NewsSearchOptions {
  maxResults?: number;
  region?: string;
  safesearch?: 'on' | 'moderate' | 'off';
  timeFilter?: 'day' | 'week' | 'month' | 'year';
}

// ─── Internal types ────────────────────────────────────────────────────

interface DdgNewsItem {
  title?: string;
  url?: string;
  source?: string;
  date?: string;
  excerpt?: string;
  image?: string;
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

// ─── newsSearch ────────────────────────────────────────────────────────

/**
 * News search via DuckDuckGo news.js endpoint.
 *
 * @param query - News search query
 * @param options - Optional: maxResults, region, safesearch, timeFilter
 */
export async function newsSearch(
  query: string,
  options?: NewsSearchOptions,
): Promise<NewsItem[]> {
  const limit = options?.maxResults ?? 5;

  // Build query parameters
  const params: Record<string, string> = {
    q: query,
    l: options?.region ?? 'us-en',
    noamp: '1',
  };

  if (options?.safesearch) {
    params.p = SAFESEARCH_MAP[options.safesearch];
  }
  if (options?.timeFilter) {
    params.df = TIMEFILTER_MAP[options.timeFilter];
  }

  const results = await ddgGet<DdgNewsItem[]>('duckduckgo.com/news.js', params);

  return results.slice(0, limit).map((item) => {
    const newsItem: NewsItem = {
      title: item.title ?? '',
      url: item.url ?? '',
      source: item.source ?? '',
      date: item.date ?? '',
      snippet: item.excerpt ?? '',
    };
    if (item.image) {
      newsItem.image = item.image;
    }
    return newsItem;
  });
}
