# Task: 07-implement-content-fetch-tool

## Feature: ddg-search-mcp

## Dependencies

- **1. khi-to-project--dependencies** (01-khi-to-project--dependencies)

## Plan Section

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

## Task Type

greenfield

## Completed Tasks

- 01-khi-to-project--dependencies: Created ddg-search-mcp/package.json, tsconfig.json, .gitignore. Installed all 100 packages (dependencies + devDependencies). npm install exit 0. typecheck errors expectedly (no src yet). Noted: NODE_ENV=production was set, needed --include=dev for devDependencies.
