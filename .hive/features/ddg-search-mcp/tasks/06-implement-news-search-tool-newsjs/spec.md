# Task: 06-implement-news-search-tool-newsjs

## Feature: ddg-search-mcp

## Dependencies

- **3. xy-dng-ddg-api-client** (03-xy-dng-ddg-api-client)

## Plan Section

### 6. Implement News Search Tool (news.js)

**Depends on**: 3

**Files:**
- Create: `ddg-search-mcp/src/news.ts`

**Module export contract:**
```typescript
// src/news.ts

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  snippet: string;
  image?: string;
}

/**
 * News search qua DuckDuckGo news.js endpoint.
 */
export async function newsSearch(query: string, maxResults?: number): Promise<NewsItem[]>
```

**What to do**:

1. **Request**: GET `https://duckduckgo.com/news.js` qua `ddgGet`
   - Parameters: `q=query`, `vqd=...`, `o=json`, `l=us-en`, `noamp=1`

2. **Parse response**:
   - Response là array, mỗi item: `title`, `url`, `source`, `date`, `excerpt`, `image`
   - Map sang `NewsItem[]`
   - Limit theo `maxResults` (default 5)

**Verify**:
- [ ] Chạy: `npx tsx -e "import {newsSearch} from './src/news.ts'; const r = await newsSearch('technology',2); console.log(JSON.stringify(r,null,2))"` → in ra array news items với title, url, source, date, snippet

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
- 03-xy-dng-ddg-api-client: Created src/client.ts with DDG API Client: DdgApiError class, ddgGet<T> (generic GET with VQD token, DDG_HEADERS, retry on network error max 2x, no retry on 4xx/5xx), ddgPost<T> (generic POST with JSON body, signal/region options), rate limiting (200ms min gap), and resetRateLimit() for testing. Added 28 comprehensive tests covering URL building, VQD integration, error handling, retry logic, rate limiting, and edge cases. All tests pass, typecheck clean.
- 07-implement-content-fetch-tool: Created `src/fetch.ts` with FetchedContent interface and fetchContent function for fetching and extracting web content. URL validation rejects non-http/https protocols, private IPs, localhost. Content extraction uses regex (no cheerio) to extract title, meta description, and body text after stripping script/style/nav/footer. Supports text/html and application/json. Error handling for invalid URLs, timeout, non-200 status, and short content (< 50 chars). Default timeout 15s, maxLength 5000. Added 18 tests covering all features. Typecheck passes.
