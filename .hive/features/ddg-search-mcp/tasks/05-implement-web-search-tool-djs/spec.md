# Task: 05-implement-web-search-tool-djs

## Feature: ddg-search-mcp

## Dependencies

- **3. Xây dựng DDG API Client** (03-xy-dng-ddg-api-client)

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
