# Task: 04-implement-qna-answer-tool-qnajs

## Feature: ddg-search-mcp

## Dependencies

- **3. xy-dng-ddg-api-client** (03-xy-dng-ddg-api-client)

## Plan Section

### 4. Implement QnA Answer Tool (qna.js)

**Depends on**: 3

**Files:**
- Create: `ddg-search-mcp/src/qna.ts`

**Module export contract:**
```typescript
// src/qna.ts

export interface QnaSource {
  site: string;
  text: string;
  link: string;
}

export interface QnaResult {
  answer: string;            // Short answer (Markdown)
  expandedAnswer: string;    // Expanded answer (Markdown, có thể có bảng)
  sources: QnaSource[];      // Wikipedia sources
  score: number;             // 0.0 - 1.0
}

/**
 * Gọi DuckDuckGo QnA API để lấy instant answer cho query.
 * Dùng qna.js endpoint — trả về câu trả lời AI từ Wikipedia.
 * Nếu không có answer (score thấp hoặc không có data) → trả về null.
 */
export async function getAnswer(query: string, options?: { region?: string }): Promise<QnaResult | null>
```

**What to do**:

1. **Request**: POST `https://duckduckgo.com/qna.js` qua `ddgPost`
   - Query params: `q=query`, `vqd=...`, `signal=low`, `upgradable=0`
   - Body JSON tối thiểu:
   ```json
   {
     "q": "<query>",
     "country_code": "US",
     "dominant_result_language": "en",
     "dw": 0,
     "has_ads": 0,
     "trigger_version": 16
   }
   ```

2. **Parse response**:
   - Response JSON có fields: `answer`, `expanded_answer`, `sources`, `score`, `action`
   - `sources` là array `[{ article: { site, text, link }, section: {} }]`
   - Nếu `score` < 0.1 hoặc không có `answer` → return `null` (no answer found)

3. **Error handling**:
   - `ddgPost` đã handle retry
   - Nếu response có `sorry_reason` → log warning, return null
   - Parse fail → throw `DdgApiError`

**Verify**:
- [ ] Chạy: `npx tsx -e "import {getAnswer} from './src/qna.ts'; const r = await getAnswer('google'); console.log(JSON.stringify({answer: r?.answer?.slice(0,100), sources: r?.sources?.length, score: r?.score}))"` → in ra `{"answer":"**Google is...","sources":1,"score":0.2}`
- [ ] Chạy với query không có answer: `getAnswer('xyznonexistent123456')` → trả về `null`

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
