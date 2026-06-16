# Task: 03-xy-dng-ddg-api-client

## Feature: ddg-search-mcp

## Dependencies

- **2. xy-dng-vqd-manager** (02-xy-dng-vqd-manager)

## Plan Section

### 3. Xây dựng DDG API Client

**Depends on**: 2

**Files:**
- Create: `ddg-search-mcp/src/client.ts`

**Module export contract:**
```typescript
// src/client.ts
import { getVqdToken } from './vqd.js';

// Các function dùng chung cho mọi API call

/**
 * Generic DDG API GET request (cho d.js, news.js, ...)
 * Tự động gắn VQD token + browser headers
 * Throws error nếu response không OK
 */
export async function ddgGet<T>(
  endpoint: string,
  params: Record<string, string>,
  options?: { maxRetries?: number; region?: string }
): Promise<T>

/**
 * Generic DDG API POST request (cho qna.js)
 * Body là JSON
 * Tự động gắn VQD token + browser headers
 */
export async function ddgPost<T>(
  endpoint: string,
  query: string,
  body: Record<string, unknown>,
  options?: { signal?: 'low' | 'high'; region?: string }
): Promise<T>
```

**What to do**:

1. **`ddgGet<T>` implementation**:
   - Gọi `getVqdToken(query, { region })` để lấy VQD
   - Build URL: `https://${endpoint}?q=${query}&vqd=${vqd}&o=json` + params
   - Fetch với DDG_HEADERS
   - Parse JSON response → return `T`
   - Retry logic: retry tối đa `maxRetries` (default 2) nếu lỗi mạng (fetch throw), không retry nếu 4xx/5xx

2. **`ddgPost<T>` implementation**:
   - Gọi `getVqdToken(query, { region })` để lấy VQD
   - Build URL: `https://${endpoint}?q=${encodeURIComponent(query)}&vqd=${vqd}&signal=${signal}&upgradable=0`
   - POST với JSON body + DDG_HEADERS
   - Parse JSON response → return `T`

3. **Rate limiting**: 1 request / 200ms tối thiểu (debounce bằng `Promise` + `setTimeout`)

4. **Error handling chung**:
   - Fetch throw (network error) → retry
   - Response !ok → throw `DdgApiError` với status code + body
   - Parse JSON fail → throw `DdgApiError`

```typescript
export class DdgApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'DdgApiError';
  }
}
```

**Verify**:
- [ ] Chạy: `npx tsx -e "import {ddgGet} from './src/client.ts'; const r = await ddgGet('links.duckduckgo.com/d.js', {q:'test'}); console.log(JSON.stringify(r).slice(0,200))"` → không lỗi, in ra JSON string

## Task Type

greenfield

## Context

## learnings

# Sandbox Network Environment

- `curl` to DuckDuckGo works (returns homepage HTML)
- Node.js `fetch` (undici) fails with `ConnectTimeoutError` (10s timeout) to DuckDuckGo
- Node.js version: v20.20.2
- This is likely an IPv6/DNS resolution issue specific to undici in this sandbox
- Unit tests should use mocked `fetch` to avoid depending on external network

# VQD Manager (vqd.ts)

- Created `src/vqd.ts` with `getVqdToken` and `VqdOptions` interface
- Cache: in-memory Map with key = `${query}:${region}`, TTL = 5 min
- VQD acquisition: POST to `https://duckduckgo.com/` with browser-like headers, body `q=${query}`
- Error handling: `VqdAcquisitionError` for non-retryable errors (403/429/missing header), network errors retry 2x (200ms, 500ms)
- `DDG_HEADERS` exported for reuse across project
- `resetVqdCache()` exported for testing
- Uses Node.js native `fetch` (available in Node.js 18+, stable in 21+)


## Completed Tasks

- 01-khi-to-project--dependencies: Created ddg-search-mcp/package.json, tsconfig.json, .gitignore. Installed all 100 packages (dependencies + devDependencies). npm install exit 0. typecheck errors expectedly (no src yet). Noted: NODE_ENV=production was set, needed --include=dev for devDependencies.
- 02-xy-dng-vqd-manager: Created src/vqd.ts with VQD Manager: getVqdToken() function, VqdOptions interface, in-memory cache (Map, TTL 5min, key=query:region), POST to duckduckgo.com with browser-like headers, x-vqd-4 header extraction, retry logic (2x with 200/500ms backoff), 403/429 no-retry. Exported DDG_HEADERS for project-wide reuse. Added vitest, 11 unit tests all pass, typecheck clean. Live DDG integration not runnable due to sandbox network restriction (Node.js connect timeout vs curl works — noted in learnings).
- 07-implement-content-fetch-tool: Created `src/fetch.ts` with FetchedContent interface and fetchContent function for fetching and extracting web content. URL validation rejects non-http/https protocols, private IPs, localhost. Content extraction uses regex (no cheerio) to extract title, meta description, and body text after stripping script/style/nav/footer. Supports text/html and application/json. Error handling for invalid URLs, timeout, non-200 status, and short content (< 50 chars). Default timeout 15s, maxLength 5000. Added 18 tests covering all features. Typecheck passes.
