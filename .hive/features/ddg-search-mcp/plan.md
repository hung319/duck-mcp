# ddg-search-mcp

## Discovery

### Original Request
> "Biến DuckDuckGo QnA API thành MCP search giống Exa AI"

### Interview Summary
- **Language**: TypeScript (dùng `@modelcontextprotocol/sdk`)
- **Location**: `/root/one/ddg-search-mcp`
- **Core idea**: Dùng DDG `qna.js`, `d.js`, `news.js` endpoints để tạo MCP server free, không cần API key
- **Target**: Cung cấp search + answer tool giống Exa AI nhưng miễn phí

### Research Findings

**DuckDuckGo Endpoints:**
- `POST https://duckduckgo.com/` (form data `{q: query}` → lấy VQD từ `x-vqd-4` response header)
- `POST https://duckduckgo.com/qna.js?q=...&vqd=...` — AI Instant Answer với Wikipedia sources
- `GET https://links.duckduckgo.com/d.js?q=...&vqd=...` — web search results
- `GET https://duckduckgo.com/news.js?q=...&vqd=...` — news search results

**VQD Token Flow** (xác nhận từ SearXNG + community):
1. POST `https://duckduckgo.com/` với form data `q=query` (Content-Type: application/x-www-form-urlencoded)
2. Response header `x-vqd-4` chứa VQD token (string dài, format `4-<numbers>`)
3. VQD có TTL ~1 giờ, nhưng cache 5 phút là an toàn
4. Nếu VQD sai → DDG trả về 403/không data → cần fetch lại

**Exa AI Features Mapping:**
| Exa Feature | DDG Equivalent | Ghi chú |
|---|---|---|
| `search` | `d.js` | Web search cơ bản |
| `answer` | `qna.js` | Instant Answer có sources |
| `contents` | Fetch URL + extract | Content scraping |
| `news` | `news.js` | News results |

**Existing MCP servers:**
- `nickclyde/duckduckgo-mcp-server` (Python) — chỉ search + fetch, không có QnA answer
- **Điểm khác biệt**: MCP server này sẽ có `get_answer()` dùng qna.js — không MCP server nào có

---

## Non-Goals
- Không làm image search (i.js) — scope quá rộng
- Không làm neural search (DDG không có, chỉ keyword search)
- Không cache layer phức tạp (chỉ VQD cache)
- Không authentication layer (MCP server public, dùng local stdio)

---

## Tasks

### 1. Khởi tạo project + dependencies

**Depends on**: none

**Files:**
- Create: `ddg-search-mcp/package.json`
- Create: `ddg-search-mcp/tsconfig.json`
- Create: `ddg-search-mcp/.gitignore`

**What to do**:

1. Tạo `package.json`:
```json
{
  "name": "ddg-search-mcp",
  "version": "1.0.0",
  "type": "module",
  "bin": { "ddg-search-mcp": "./dist/index.js" },
  "scripts": {
    "start": "tsx src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.13.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0"
  }
}
```

2. Tạo `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

3. Tạo `.gitignore`:
```
node_modules/
dist/
*.tsbuildinfo
```

**Verify**:
- [ ] Chạy: `npm install` → exit code 0
- [ ] Chạy: `npm run typecheck` (trước khi có src sẽ báo lỗi, đó là OK) → ít nhất `npm install` không lỗi

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

### 7. Implement Content Fetch Tool

**Depends on**: 1

**Files:**
- Create: `ddg-search-mcp/src/fetch.ts`

**Module export contract:**
```typescript
// src/fetch.ts

export interface FetchedContent {
  title: string;
  content: string;   // Plain text, whitespace-normalized
  url: string;
  description?: string;
}

/**
 * Fetch URL và extract nội dung chính.
 * - Title: từ <title> tag hoặc <h1> đầu tiên
 * - Content: text content từ <body> (strip scripts, styles, nav, footer)
 * - Description: từ <meta name="description">
 * - Timeout: 15s
 * - Chỉ chấp nhận http/https URLs
 */
export async function fetchContent(url: string, maxLength?: number): Promise<FetchedContent>
```

**What to do**:

1. **URL validation**:
   - Chỉ accept `http://` và `https://` protocols
   - Reject IP-based URLs (private ranges: 10.x, 127.x, 192.168.x, 172.16-31.x)
   - Reject localhost

2. **Request**: Fetch URL với browser-like headers + timeout 15s
   - Content-Type response text/html → extract
   - Content-Type application/json → return raw JSON text

3. **Content extraction** (không dùng cheerio, dùng regex + string ops):
   - Extract `<title>` tag content
   - Extract `<meta name="description" content="...">`
   - Remove: `<script>...</script>`, `<style>...</style>`, `<nav>...</nav>`, `<footer>...</footer>`
   - Remove all HTML tags → plain text
   - Normalize whitespace (collapse spaces, trim)
   - Truncate theo `maxLength` (default 5000 ký tự)

4. **Error handling**:
   - URL invalid → throw error "Invalid URL"
   - Timeout → throw error "Request timeout"
   - Non-200 → throw error with status code
   - Content too short (< 50 chars) → throw error "No content found"

**Verify**:
- [ ] Chạy: `npx tsx -e "import {fetchContent} from './src/fetch.ts'; const r = await fetchContent('https://example.com'); console.log(JSON.stringify({title: r.title, contentLength: r.content.length}))"` → in ra `{"title":"Example Domain","contentLength":...}`
- [ ] Chạy với URL invalid: `fetchContent('ftp://bad.com')` → throw error

### 8. Build MCP Server + Đăng ký Tools

**Depends on**: 4, 5, 6, 7

**Files:**
- Create: `ddg-search-mcp/src/index.ts`
- Modify: `ddg-search-mcp/package.json` (thêm scripts nếu cần)

**Module export contract:**
```typescript
// src/index.ts — Entry point

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Tools:
// 1. ddg_get_answer  — QnA answer (Exa Answer equivalent)
// 2. ddg_search      — Web search
// 3. ddg_search_news — News search
// 4. ddg_fetch_content — URL content fetch

async function main() {
  const server = new McpServer({
    name: "ddg-search-mcp",
    version: "1.0.0",
  });

  server.tool(
    "ddg_get_answer",
    "Get an AI-powered answer with sources for a question (like Exa Answer). Uses DuckDuckGo Instant Answer engine with Wikipedia.",
    {
      query: z.string().min(1).describe("The question or search query"),
    },
    async ({ query }) => { /* call getAnswer, format result */ }
  );

  server.tool(
    "ddg_search",
    "Search the web using DuckDuckGo. Returns organic results with titles, URLs, and descriptions.",
    {
      query: z.string().min(1).describe("Search query"),
      maxResults: z.number().min(1).max(50).optional().default(10).describe("Maximum results to return (default 10)"),
      region: z.string().optional().describe("Region code (e.g. 'us-en', 'vn-vi', 'wt-wt' for worldwide)"),
    },
    async ({ query, maxResults, region }) => { /* call webSearch */ }
  );

  server.tool(
    "ddg_search_news",
    "Search news articles using DuckDuckGo. Returns recent news with sources and dates.",
    {
      query: z.string().min(1).describe("News search query"),
      maxResults: z.number().min(1).max(20).optional().default(5).describe("Maximum news results (default 5)"),
    },
    async ({ query, maxResults }) => { /* call newsSearch */ }
  );

  server.tool(
    "ddg_fetch_content",
    "Fetch and extract main content from a URL. Returns title, description, and text content.",
    {
      url: z.string().url().describe("The URL to fetch content from"),
      maxLength: z.number().min(100).max(50000).optional().default(5000).describe("Maximum characters to return (default 5000)"),
    },
    async ({ url, maxLength }) => { /* call fetchContent */ }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

**Mỗi tool handler cần**:
- try-catch riêng, trả về content kiểu `{ content: [{ type: "text", text: result }] }`
- Format output đẹp (Markdown)
- Error message friendly (không throw stack trace ra ngoài)

**What to do**:
1. Viết `src/index.ts` với 4 tools như trên
2. Import các function từ module tương ứng
3. Mỗi tool handler wrap trong try-catch
4. Output format mỗi tool:
   - `ddg_get_answer`: Markdown với answer + expanded + sources
   - `ddg_search`: Markdown list hoặc JSON
   - `ddg_search_news`: Markdown list
   - `ddg_fetch_content`: Markdown với title + content

5. Thêm script `"start": "tsx src/index.ts"` vào package.json

**Verify**:
- [ ] Chạy: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts` → stdout có JSON-RPC response với 4 tools: `ddg_get_answer`, `ddg_search`, `ddg_search_news`, `ddg_fetch_content`

### 9. Test full flow

**Depends on**: 8

**What to do**:

1. **Test ddg_get_answer**:
```
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ddg_get_answer","arguments":{"query":"what is python"}}}' | npx tsx src/index.ts
```
Expected: stdout JSON-RPC với content chứa answer về Python

2. **Test ddg_search**:
```
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ddg_search","arguments":{"query":"hello world","maxResults":3}}}' | npx tsx src/index.ts
```
Expected: stdout JSON-RPC với 3 kết quả search

3. **Test ddg_search_news**:
```
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ddg_search_news","arguments":{"query":"technology","maxResults":2}}}' | npx tsx src/index.ts
```
Expected: stdout JSON-RPC với 2 news items

4. **Test ddg_fetch_content**:
```
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"ddg_fetch_content","arguments":{"url":"https://example.com"}}}' | npx tsx src/index.ts
```
Expected: stdout JSON-RPC với content từ example.com

**Verify**:
- [ ] 4 tools/list test → 4 tools được list
- [ ] Cả 4 tools/call test → trả về kết quả đúng format (không error)
