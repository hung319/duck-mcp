import { httpPost } from './http.js';
import { DdgApiError } from './errors.js';

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

// ─── Browser-like headers for DDG HTML endpoint ─────────────────────────
// DDG bot detection checks Sec-Fetch headers + Accept-Language + UA.
// These headers must match a real browser to avoid CAPTCHA/anomaly modal.

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://html.duckduckgo.com',
  'Referer': 'https://html.duckduckgo.com/html/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Upgrade-Insecure-Requests': '1',
  'Content-Type': 'application/x-www-form-urlencoded',
};

// ─── HTML Helpers ───────────────────────────────────────────────────────

function extractText(html: string, className: string, tag = 'a'): string[] {
  const results: string[] = [];
  const regex = new RegExp(
    `<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    'gi',
  );
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) results.push(text);
  }
  return results;
}

function extractUrls(html: string, className: string, tag = 'a'): string[] {
  const results: string[] = [];
  const regex = new RegExp(
    `<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*href="([^"]*)"[^>]*>`,
    'gi',
  );
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1].trim();
    if (url) results.push(url);
  }
  return results;
}

function htmlDecode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#39;/g, "'")
    .replace(/&#60;/g, '<')
    .replace(/&#62;/g, '>');
}

function extractHostname(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return '';
  }
}

// ─── webSearch ──────────────────────────────────────────────────────────

/**
 * Web search via DuckDuckGo HTML (no-JS) endpoint.
 * Posts to html.duckduckgo.com/html with browser-like headers.
 * No VQD token needed. Bypasses DDG's JS challenge.
 */
export async function webSearch(
  query: string,
  options?: SearchOptions,
): Promise<SearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const maxResults = options?.maxResults ?? 10;

  const params = new URLSearchParams({ q: trimmedQuery });
  if (options?.region) {
    params.set('kl', options.region);
  }

  const response = await httpPost(
    'https://html.duckduckgo.com/html/',
    params.toString(),
    BROWSER_HEADERS,
    10000,
  );

  if (response.status < 200 || response.status >= 300) {
    throw new DdgApiError(
      `HTTP ${response.status}: ${response.body.slice(0, 200)}`,
      response.status,
      response.body,
    );
  }

  // Check for DDG anomaly (anti-bot) page
  if (response.body.includes('anomaly-modal') || response.body.includes('challenge')) {
    throw new DdgApiError(
      'DuckDuckGo blocked the request with anti-bot challenge. Try again later or use a different IP.',
      429,
      response.body.slice(0, 300),
    );
  }

  // Parse HTML for organic results
  const titles = extractText(response.body, 'result__a');
  const urls = extractUrls(response.body, 'result__a');
  const snippets = extractText(response.body, 'result__snippet');

  const results: SearchResult[] = [];
  for (let i = 0; i < Math.min(titles.length, urls.length, maxResults); i++) {
    const url = urls[i];
    if (!url) continue;
    results.push({
      title: htmlDecode(titles[i] ?? ''),
      url,
      description: htmlDecode(snippets[i] ?? ''),
      hostname: extractHostname(url),
    });
  }

  return results;
}
