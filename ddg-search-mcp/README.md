# 🦆 ddg-search-mcp

MCP server for DuckDuckGo search — **free AI answers, web search, news, and content fetch**. No API key needed.

> Rivals Exa AI for the free tier. Powered by DuckDuckGo's undocumented QnA endpoint.

## Features

- **`ddg_get_answer`** — AI answer with sources (like Exa Answer API)
- **`ddg_search`** — Web search results
- **`ddg_search_news`** — News search
- **`ddg_fetch_content`** — URL content extraction

## Quick Start

### Claude Desktop / Cursor / VS Code

Add to your MCP config:

```json
{
  "mcpServers": {
    "ddg-search": {
      "command": "npx",
      "args": ["ddg-search-mcp"]
    }
  }
}
```

### CLI

```bash
npx ddg-search-mcp
```

## Tools

| Tool | Input | Description |
|------|-------|-------------|
| `ddg_get_answer` | `query` | AI-generated answer with source citations |
| `ddg_search` | `query`, `maxResults?`, `region?` | Web search results |
| `ddg_search_news` | `query`, `maxResults?` | News articles |
| `ddg_fetch_content` | `url`, `maxLength?` | Extract text from URL |

## Why DuckDuckGo?

| Feature | Exa AI | ddg-search-mcp |
|---------|--------|----------------|
| Search | $7/1K req | **Free** |
| Answer | $5/1K req | **Free** (qna.js) |
| Content Fetch | $1/1K pages | **Free** |
| API Key | Required | **Not needed** |

## Development

```bash
git clone https://github.com/hung319/duck-mcp
cd duck-mcp
npm install
npm run build
npm test     # 88+ tests
npm start    # Run MCP server
```

## License

MIT
