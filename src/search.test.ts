import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SearchResult } from './search.js';
import { DdgApiError } from './client.js';

// Mock the client module
vi.mock('./client.js', () => ({
  ddgGet: vi.fn(),
  DdgApiError: class extends Error {
    declare statusCode?: number;
    declare body?: string;
    constructor(
      message: string,
      statusCode?: number,
      body?: string,
    ) {
      super(message);
      this.name = 'DdgApiError';
      this.statusCode = statusCode;
      this.body = body;
    }
  },
}));

function makeRawResult(overrides: Partial<Record<'t' | 'u' | 'a' | 's', string>> = {}) {
  return {
    t: overrides.t ?? 'Test Title',
    u: overrides.u ?? 'https://example.com/page',
    a: overrides.a ?? 'A test description for the result',
    s: overrides.s ?? 'example.com',
  };
}

// ─── webSearch ──────────────────────────────────────────────────────────

describe('webSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls ddgGet with the correct endpoint and parameters', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue([makeRawResult()]);
    const { webSearch: ws } = await import('./search.js');

    await ws('hello world');

    expect(ddgGet).toHaveBeenCalledWith(
      'links.duckduckgo.com/d.js',
      expect.objectContaining({
        q: 'hello world',
        p: '1',
      }),
      undefined,
    );
  });

  it('passes region option to ddgGet', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue([makeRawResult()]);
    const { webSearch: ws } = await import('./search.js');

    await ws('test', { region: 'de-de' });

    expect(ddgGet).toHaveBeenCalledWith(
      'links.duckduckgo.com/d.js',
      expect.objectContaining({ q: 'test', p: '1' }),
      { region: 'de-de' },
    );
  });

  it('maps raw response fields to SearchResult correctly', async () => {
    const { ddgGet } = await import('./client.js');
    const raw = makeRawResult({
      t: 'DuckDuckGo',
      u: 'https://duckduckgo.com/about',
      a: 'Privacy-focused search engine',
      s: 'duckduckgo.com',
    });
    vi.mocked(ddgGet).mockResolvedValue([raw]);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual<SearchResult>({
      title: 'DuckDuckGo',
      url: 'https://duckduckgo.com/about',
      description: 'Privacy-focused search engine',
      hostname: 'duckduckgo.com',
    });
  });

  it('handles empty response array', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue([]);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toEqual([]);
  });

  it('handles null or undefined response gracefully', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue(null);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toEqual([]);
  });

  it('filters out results without a valid url', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue([
      makeRawResult({ u: 'https://valid.com/page' }),
      makeRawResult({ u: '' }),
      { t: 'No URL', a: 'desc', s: 'x.com' }, // no u at all
    ]);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://valid.com/page');
  });

  it('limits results to maxResults (default 10)', async () => {
    const { ddgGet } = await import('./client.js');
    const rawResults = Array.from({ length: 20 }, (_, i) =>
      makeRawResult({
        t: `Result ${i}`,
        u: `https://example.com/page${i}`,
      }),
    );
    vi.mocked(ddgGet).mockResolvedValue(rawResults);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toHaveLength(10);
  });

  it('respects custom maxResults option', async () => {
    const { ddgGet } = await import('./client.js');
    const rawResults = Array.from({ length: 20 }, (_, i) =>
      makeRawResult({
        t: `Result ${i}`,
        u: `https://example.com/page${i}`,
      }),
    );
    vi.mocked(ddgGet).mockResolvedValue(rawResults);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test', { maxResults: 3 });

    expect(results).toHaveLength(3);
  });

  it('returns all results if maxResults exceeds results length', async () => {
    const { ddgGet } = await import('./client.js');
    const rawResults = Array.from({ length: 3 }, (_, i) =>
      makeRawResult({
        t: `Result ${i}`,
        u: `https://example.com/page${i}`,
      }),
    );
    vi.mocked(ddgGet).mockResolvedValue(rawResults);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test', { maxResults: 10 });

    expect(results).toHaveLength(3);
  });

  it('propagates DdgApiError from ddgGet', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockRejectedValue(
      new DdgApiError('HTTP 429: Too Many Requests', 429, 'rate limited'),
    );
    const { webSearch: ws } = await import('./search.js');

    await expect(ws('test')).rejects.toThrow(DdgApiError);
    await expect(ws('test')).rejects.toThrow('429');
  });

  it('normalizes query (trims whitespace)', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue([makeRawResult()]);
    const { webSearch: ws } = await import('./search.js');

    await ws('  hello world  ');

    expect(ddgGet).toHaveBeenCalledWith(
      'links.duckduckgo.com/d.js',
      expect.objectContaining({ q: 'hello world' }),
      undefined,
    );
  });

  it('handles missing optional fields in raw result', async () => {
    const { ddgGet } = await import('./client.js');
    vi.mocked(ddgGet).mockResolvedValue([
      { t: 'Title Only', u: 'https://example.com' }, // no a, no s
    ]);
    const { webSearch: ws } = await import('./search.js');

    const results = await ws('test');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual<SearchResult>({
      title: 'Title Only',
      url: 'https://example.com',
      description: '',
      hostname: '',
    });
  });
});
