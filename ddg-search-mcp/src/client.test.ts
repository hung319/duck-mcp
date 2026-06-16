import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ddgGet, ddgPost, DdgApiError, resetRateLimit } from './client.js';

const FAKE_TOKEN = vi.hoisted(() => '4-test-token-12345');

// Mock the vqd module
vi.mock('./vqd.js', () => ({
  getVqdToken: vi.fn().mockResolvedValue(FAKE_TOKEN),
  DDG_HEADERS: {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://duckduckgo.com',
    Referer: 'https://duckduckgo.com/',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
}));

function mockJsonResponse(
  data: unknown,
  overrides: Partial<Response> = {},
): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    ...overrides,
  } as Response;
}

function mockErrorResponse(
  status: number,
  body: string = 'Error',
): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(body),
    ...({} as Partial<Response>),
  } as Response;
}

// ─── DdgApiError ──────────────────────────────────────────────────────

describe('DdgApiError', () => {
  it('has name set to DdgApiError', () => {
    const err = new DdgApiError('something went wrong');
    expect(err.name).toBe('DdgApiError');
  });

  it('stores statusCode and body when provided', () => {
    const err = new DdgApiError('Not found', 404, '{"error":"not found"}');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.body).toBe('{"error":"not found"}');
  });

  it('defaults statusCode and body to undefined', () => {
    const err = new DdgApiError('generic');
    expect(err.statusCode).toBeUndefined();
    expect(err.body).toBeUndefined();
  });
});

// ─── ddgGet ───────────────────────────────────────────────────────────

describe('ddgGet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  it('calls getVqdToken with the query and default region', async () => {
    const { getVqdToken } = await import('./vqd.js');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ foo: 'bar' }),
    );

    await ddgGet('links.duckduckgo.com/d.js', { q: 'hello' });

    expect(getVqdToken).toHaveBeenCalledWith('hello', { region: undefined });
  });

  it('passes region option to getVqdToken', async () => {
    const { getVqdToken } = await import('./vqd.js');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ foo: 'bar' }),
    );

    await ddgGet('links.duckduckgo.com/d.js', { q: 'test' }, { region: 'de-de' });

    expect(getVqdToken).toHaveBeenCalledWith('test', { region: 'de-de' });
  });

  it('builds the correct URL with VQD token and o=json', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ results: [] }),
    );

    await ddgGet('links.duckduckgo.com/d.js', { q: 'hello world' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain('links.duckduckgo.com/d.js');
    expect(url).toContain('q=hello+world');
    expect(url).toContain(`vqd=${FAKE_TOKEN}`);
    expect(url).toContain('o=json');
  });

  it('appends extra params to the URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ results: [] }),
    );

    await ddgGet('links.duckduckgo.com/d.js', {
      q: 'test',
      kl: 'us-en',
      df: '2024-01',
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('kl=us-en');
    expect(url).toContain('df=2024-01');
  });

  it('sends a GET request with DDG_HEADERS', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ results: [] }),
    );

    await ddgGet('links.duckduckgo.com/d.js', { q: 'test' });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method ?? 'GET').toBe('GET');
    expect(options.headers).toEqual(
      expect.objectContaining({
        'User-Agent': expect.stringContaining('Mozilla'),
        Accept: '*/*',
        Origin: 'https://duckduckgo.com',
      }),
    );
  });

  it('returns parsed JSON response', async () => {
    const data = { results: [{ title: 'Test' }] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(data),
    );

    const result = await ddgGet<{ results: Array<{ title: string }> }>(
      'links.duckduckgo.com/d.js',
      { q: 'test' },
    );

    expect(result).toEqual(data);
  });

  it('retries on network error up to default maxRetries (2)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValue(mockJsonResponse({ ok: true }));

    const result = await ddgGet('links.duckduckgo.com/d.js', { q: 'test' });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('respects custom maxRetries option', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(mockJsonResponse({ ok: true }));

    const result = await ddgGet(
      'links.duckduckgo.com/d.js',
      { q: 'test' },
      { maxRetries: 1 },
    );

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 4xx response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockErrorResponse(400, 'Bad request'));

    await expect(
      ddgGet('links.duckduckgo.com/d.js', { q: 'test' }),
    ).rejects.toThrow(DdgApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 5xx response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(mockErrorResponse(503, 'Service unavailable'));

    await expect(
      ddgGet('links.duckduckgo.com/d.js', { q: 'test' }),
    ).rejects.toThrow(DdgApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws DdgApiError with statusCode and body on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockErrorResponse(429, 'Too many requests'),
    );

    let err: unknown;
    try {
      await ddgGet('links.duckduckgo.com/d.js', { q: 'test' });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(DdgApiError);
    if (err instanceof DdgApiError) {
      expect(err.statusCode).toBe(429);
      expect(err.body).toBe('Too many requests');
    }
  });

  it('throws DdgApiError when JSON parsing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.reject(new Error('Unexpected token')),
      text: () => Promise.resolve('not json'),
    } as Response);

    await expect(
      ddgGet('links.duckduckgo.com/d.js', { q: 'test' }),
    ).rejects.toThrow(DdgApiError);
  });

  it('throws DdgApiError on all retries exhausted', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('Network down'),
    );

    await expect(
      ddgGet('links.duckduckgo.com/d.js', { q: 'test' }, { maxRetries: 1 }),
    ).rejects.toThrow(DdgApiError);

    // Verify error message includes something about network
    await expect(
      ddgGet('links.duckduckgo.com/d.js', { q: 'test' }, { maxRetries: 1 }),
    ).rejects.toThrow('Network');
  });
});

// ─── ddgPost ──────────────────────────────────────────────────────────

describe('ddgPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  it('calls getVqdToken with the query and default region', async () => {
    const { getVqdToken } = await import('./vqd.js');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ answer: '42' }),
    );

    await ddgPost('duckduckgo.com/qna', 'the question', {});

    expect(getVqdToken).toHaveBeenCalledWith('the question', {
      region: undefined,
    });
  });

  it('passes region option to getVqdToken', async () => {
    const { getVqdToken } = await import('./vqd.js');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ answer: '42' }),
    );

    await ddgPost(
      'duckduckgo.com/qna',
      'test',
      {},
      { region: 'de-de' },
    );

    expect(getVqdToken).toHaveBeenCalledWith('test', { region: 'de-de' });
  });

  it('builds the correct URL with signal and upgradable', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ answer: '42' }),
    );

    await ddgPost('duckduckgo.com/qna', 'hello world', {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain('duckduckgo.com/qna');
    expect(url).toContain('q=hello%20world');
    expect(url).toContain(`vqd=${FAKE_TOKEN}`);
    expect(url).toContain('upgradable=0');
  });

  it('uses signal=low by default', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ answer: '42' }),
    );

    await ddgPost('duckduckgo.com/qna', 'test', {});

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('signal=low');
  });

  it('uses signal=high when specified', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ answer: '42' }),
    );

    await ddgPost(
      'duckduckgo.com/qna',
      'test',
      {},
      { signal: 'high' },
    );

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('signal=high');
  });

  it('sends POST request with JSON body and DDG_HEADERS', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ answer: '42' }),
    );

    const body = { query: 'test', someKey: 'value' };
    await ddgPost('duckduckgo.com/qna', 'test', body);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Accept: '*/*',
        Origin: 'https://duckduckgo.com',
      }),
    );
    expect(JSON.parse(options.body as string)).toEqual(body);
  });

  it('returns parsed JSON response', async () => {
    const data = { answer: 'The answer is 42', results: [] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse(data),
    );

    const result = await ddgPost<{ answer: string; results: Array<unknown> }>(
      'duckduckgo.com/qna',
      'test',
      {},
    );

    expect(result).toEqual(data);
  });

  it('throws DdgApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockErrorResponse(403, 'Forbidden'),
    );

    await expect(
      ddgPost('duckduckgo.com/qna', 'test', {}),
    ).rejects.toThrow(DdgApiError);
  });

  it('throws DdgApiError on JSON parse failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.reject(new Error('parse error')),
      text: () => Promise.resolve('bad json'),
    } as Response);

    await expect(
      ddgPost('duckduckgo.com/qna', 'test', {}),
    ).rejects.toThrow(DdgApiError);
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────

describe('rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  it('allows a single request without delay', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ ok: true }),
    );

    const start = Date.now();
    await ddgGet('links.duckduckgo.com/d.js', { q: 'test' });
    const elapsed = Date.now() - start;

    // Single request should be fast (< 100ms ideally)
    expect(elapsed).toBeLessThan(200);
  });

  it('enforces minimum 200ms gap between successive requests', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ ok: true }),
    );

    const start = Date.now();
    await ddgGet('links.duckduckgo.com/d.js', { q: 'first' });
    await ddgGet('links.duckduckgo.com/d.js', { q: 'second' });
    const elapsed = Date.now() - start;

    // Two requests with 200ms gap: at least 200ms total
    expect(elapsed).toBeGreaterThanOrEqual(180);
  });

  it('does not delay when 200ms has already elapsed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ ok: true }),
    );

    await ddgGet('links.duckduckgo.com/d.js', { q: 'first' });
    await new Promise((r) => setTimeout(r, 300));
    // Reset mock so fetch is fast
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockJsonResponse({ ok: true }),
    );

    const start = Date.now();
    await ddgGet('links.duckduckgo.com/d.js', { q: 'second' });
    const elapsed = Date.now() - start;

    // After 300ms pause, next request should not be delayed
    expect(elapsed).toBeLessThan(200);
  });
});
