# Task: 03-xy-dng-ddg-api-client

## Feature: ddg-search-mcp

## Dependencies

- **2. Xây dựng VQD Manager** (02-xy-dng-vqd-manager)

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
