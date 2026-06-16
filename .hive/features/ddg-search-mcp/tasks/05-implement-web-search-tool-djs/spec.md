# Task: 05-implement-web-search-tool-djs

## Feature: ddg-search-mcp

## Dependencies

- **3. xy-dng-ddg-api-client** (03-xy-dng-ddg-api-client)

## Plan Section

### 5. Implement Web Search Tool (d.js)

**Depends on**: 3

**Files:**
- Create: `ddg-search-mcp/src/search.ts`

**Module export contract:**
```typescript
// src/search.ts

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  hostname: string;
}

export interface SearchOptions {
  maxResults?: number;  // default 10
  region?: string;      // default 'wt-wt'
}

/**
 * Web search qua DuckDuckGo d.js endpoint.
 * Trả về organic results (title, url, description, hostname).
 */
export async function webSearch(query: string, options?: SearchOptions): Promise<SearchResult[]>
```

**What to do**:

1. **Request**: GET `https://links.duckduckgo.com/d.js` qua `ddgGet`
   - Parameters: `q=query`, `vqd=...`, `o=json`, `p=1`
   - `ddgGet` tự động gắn VQD

2. **Parse response**:
   - Response là array các result objects
   - Mỗi object có: `t` (title), `u` (url), `a` (description/abstract), `s` (source/hostname)
   - Map sang `SearchResult[]`
   - Filter: chỉ lấy result có `u` (url) hợp lệ
   - Limit theo `maxResults`

3. **Error handling**:
   - Empty response → return `[]`
   - Parse fail → throw `DdgApiError`

**Verify**:
- [ ] Chạy: `npx tsx -e "import {webSearch} from './src/search.ts'; const r = await webSearch('hello world', {maxResults:3}); console.log(JSON.stringify(r,null,2))"` → in ra array 3 items, mỗi item có `{title, url, description, hostname}`

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
