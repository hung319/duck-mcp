import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SearchResult } from './search.js';
import { DdgApiError } from './errors.js';

// Mock httpPost
vi.mock('./http.js', () => ({
  httpPost: vi.fn(),
}));

function makeSearchHtml(results: { title: string; url: string; snippet: string }[]): string {
  const items = results.map(
    (r) =>
      `<div class="result results_links results_links_deep web-result ">
        <div class="result__extras">
          <div class="result__extras__url">
            <a rel="nofollow" class="result__a" href="${r.url}">${r.title}</a>
          </div>
        </div>
        <a class="result__snippet" href="${r.url}">${r.snippet}</a>
      </div>`,
  );
  return `<html><body><div class="serp__results"><div class="results--main">${items.join('\n')}</div></div></body></html>`;
}

function makeResponse(html: string, status = 200) {
  return { status, body: html, headers: {} };
}

// ─── webSearch ──────────────────────────────────────────────────────────

describe('webSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to DDG HTML endpoint with query and browser headers', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue(makeResponse(makeSearchHtml([
      { title: 'Test', url: 'https://example.com', snippet: '' },
    ])));
    const { webSearch: ws } = await import('./search.js');

    await ws('hello world');

    expect(httpPost).toHaveBeenCalledWith(
      'https://html.duckduckgo.com/html/',
      expect.stringContaining('q=hello+world'),
      expect.objectContaining({
        'Origin': 'https://html.duckduckgo.com',
        'Referer': 'https://html.duckduckgo.com/html/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      }),
      10000,
    );
  });

  it('passes region as kl parameter', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue(makeResponse(makeSearchHtml([
      { title: 'Test', url: 'https://example.com', snippet: '' },
    ])));
    const { webSearch: ws } = await import('./search.js');

    await ws('test', { region: 'vn-vi' });

    expect(httpPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('kl=vn-vi'),
      expect.anything(),
      10000,
    );
  });

  it('parses search results correctly', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue(makeResponse(makeSearchHtml([
      {
        title: 'Hello World - Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Hello,_world',
        snippet: 'A Hello, world program is a simple computer program.',
      },
      {
        title: 'Hello World - Wikiversity',
        url: 'https://en.wikiversity.org/wiki/Hello,_world!',
        snippet: 'Hello World! by Brian Kernighan.',
      },
    ])));
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('hello world');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'Hello World - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Hello,_world',
      description: 'A Hello, world program is a simple computer program.',
      hostname: 'en.wikipedia.org',
    });
    expect(results[1]).toEqual({
      title: 'Hello World - Wikiversity',
      url: 'https://en.wikiversity.org/wiki/Hello,_world!',
      description: 'Hello World! by Brian Kernighan.',
      hostname: 'en.wikiversity.org',
    });
  });

  it('respects maxResults option', async () => {
    const { httpPost } = await import('./http.js');
    const items = Array.from({ length: 20 }, (_, i) => ({
      title: `Result ${i}`,
      url: `https://example.com/${i}`,
      snippet: `Description ${i}`,
    }));
    vi.mocked(httpPost).mockResolvedValue(makeResponse(makeSearchHtml(items)));
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test', { maxResults: 3 });

    expect(results).toHaveLength(3);
  });

  it('returns empty array for empty query', async () => {
    const { webSearch: ws } = await import('./search.js');
    const results = await ws('  ');
    expect(results).toEqual([]);
  });

  it('handles HTML entities in titles and snippets', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue(makeResponse(makeSearchHtml([
      {
        title: 'Hello &amp; World &quot;Test&quot;',
        url: 'https://example.com',
        snippet: 'Some &lt;code&gt; example',
      },
    ])));
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results[0].title).toBe('Hello & World "Test"');
    expect(results[0].description).toBe('Some <code> example');
  });

  it('throws DdgApiError on non-200 status', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue({ status: 500, body: 'Error', headers: {} });
    const { webSearch: ws } = await import('./search.js');

    await expect(ws('test')).rejects.toThrow(DdgApiError);
  });

  it('throws DdgApiError on anomaly/block page', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue(makeResponse(
      '<html><body><div class="anomaly-modal__title">Are you human?</div></body></html>',
    ));
    const { webSearch: ws } = await import('./search.js');

    await expect(ws('test')).rejects.toThrow(DdgApiError);
  });

  it('returns empty array when no results found', async () => {
    const { httpPost } = await import('./http.js');
    vi.mocked(httpPost).mockResolvedValue(makeResponse('<html><body>No results</body></html>'));
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toEqual([]);
  });
});
