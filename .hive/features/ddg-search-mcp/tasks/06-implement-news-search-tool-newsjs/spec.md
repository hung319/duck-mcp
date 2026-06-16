# Task: 06-implement-news-search-tool-newsjs

## Feature: ddg-search-mcp

## Dependencies

- **3. Xây dựng DDG API Client** (03-xy-dng-ddg-api-client)

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
