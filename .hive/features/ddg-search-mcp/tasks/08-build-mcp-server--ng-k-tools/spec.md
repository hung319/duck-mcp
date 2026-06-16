# Task: 08-build-mcp-server--ng-k-tools

## Feature: ddg-search-mcp

## Dependencies

- **4. Implement QnA Answer Tool (qna.js)** (04-implement-qna-answer-tool-qnajs)
- **5. Implement Web Search Tool (d.js)** (05-implement-web-search-tool-djs)
- **6. Implement News Search Tool (news.js)** (06-implement-news-search-tool-newsjs)
- **7. Implement Content Fetch Tool** (07-implement-content-fetch-tool)

## Plan Section

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

## Task Type

modification
