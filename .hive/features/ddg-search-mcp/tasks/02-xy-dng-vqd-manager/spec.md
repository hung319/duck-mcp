# Task: 02-xy-dng-vqd-manager

## Feature: ddg-search-mcp

## Dependencies

- **1. Khởi tạo project + dependencies** (01-khi-to-project--dependencies)

## Plan Section

### 2. Xây dựng VQD Manager

**Depends on**: 1

**Files:**
- Create: `ddg-search-mcp/src/vqd.ts`

**Module export contract:**
```typescript
// src/vqd.ts
export interface VqdOptions {
  region?: string;
}

/**
 * Lấy VQD token cho query + region.
 * Cache in-memory với TTL 5 phút.
 * Nếu cache miss → POST duckduckgo.com để lấy token mới.
 */
export async function getVqdToken(query: string, options?: VqdOptions): Promise<string>
```

**What to do**:

1. **Cache interface**: `Map<string, { token: string; expiresAt: number }>` với key = `${query}:${region || 'wt-wt'}`

2. **VQD acquisition flow**:
   - POST `https://duckduckgo.com/` với:
     - Headers: browser-like (User-Agent mobile Chrome, Accept, Accept-Language, Origin, Referer)
     - Body: `q=${encodeURIComponent(query)}` (Content-Type: application/x-www-form-urlencoded)
   - Đọc `x-vqd-4` từ response headers
   - Nếu không có header → throw error "Failed to acquire VQD token"

3. **Error handling**:
   - Network error → retry 2 lần với exponential backoff (200ms, 500ms)
   - 403/429 → throw error, không retry (DDG block)
   - Cache hit → return token ngay

4. **Browser-like headers constants** (dùng chung cho toàn bộ project):
```typescript
const DDG_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://duckduckgo.com",
  "Referer": "https://duckduckgo.com/",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
};
```

**Verify**:
- [ ] Chạy: `node -e "import {getVqdToken} from './src/vqd.ts'; console.log(await getVqdToken('test'))"` via `npx tsx -e "..."` → in ra string dài > 50 ký tự, format bắt đầu bằng `4-`
- [ ] Chạy lần 2 (cached) → trả về nhanh (< 50ms)

## Task Type

greenfield
