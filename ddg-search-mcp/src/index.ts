import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getAnswer } from "./qna.js";
import { webSearch } from "./search.js";
import { newsSearch } from "./news.js";
import { fetchContent } from "./fetch.js";

// ─── MCP Server ─────────────────────────────────────────────────────────

const server = new McpServer({
  name: "ddg-search-mcp",
  version: "1.0.0",
});

// ─── Tool 1: ddg_get_answer ─────────────────────────────────────────────

server.tool(
  "ddg_get_answer",
  "Get an AI-powered answer with sources for a question (like Exa Answer). Uses DuckDuckGo Instant Answer engine with Wikipedia.",
  {
    query: z.string().min(1).describe("The question or search query"),
  },
  async ({ query }) => {
    try {
      const result = await getAnswer(query);
      if (!result) {
        return {
          content: [{ type: "text" as const, text: "No answer found for this query." }],
        };
      }

      const lines: string[] = [];
      lines.push(`## Answer\n${result.answer}\n`);

      if (result.expandedAnswer) {
        lines.push(`## Details\n${result.expandedAnswer}\n`);
      }

      if (result.sources && result.sources.length > 0) {
        lines.push(`## Sources (${result.sources.length})`);
        for (const source of result.sources) {
          const link = source.link ? ` [${source.link}](${source.link})` : "";
          lines.push(`- **${source.site}**: ${source.text}${link}`);
        }
        lines.push("");
      }

      lines.push(`---\n*Score: ${(result.score * 100).toFixed(0)}% confident*`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching answer: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  },
);

// ─── Tool 2: ddg_search ─────────────────────────────────────────────────

server.tool(
  "ddg_search",
  "Search the web using DuckDuckGo. Returns organic results with titles, URLs, and descriptions.",
  {
    query: z.string().min(1).describe("Search query"),
    maxResults: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum results to return (default 10)"),
    region: z
      .string()
      .optional()
      .describe("Region code (e.g. 'us-en', 'vn-vi', 'wt-wt' for worldwide)"),
  },
  async ({ query, maxResults, region }) => {
    try {
      const results = await webSearch(query, {
        maxResults,
        ...(region ? { region } : {}),
      });

      if (!results || results.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No search results found." }],
        };
      }

      const lines: string[] = [];
      lines.push(`## Search Results for "${query}"\n`);

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        lines.push(`### ${i + 1}. ${r.title}`);
        if (r.description) lines.push(`${r.description}`);
        lines.push(`- **URL**: ${r.url}`);
        if (r.hostname) lines.push(`- **Source**: ${r.hostname}`);
        lines.push("");
      }

      lines.push(`---\n*${results.length} results*`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error performing search: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  },
);

// ─── Tool 3: ddg_search_news ────────────────────────────────────────────

server.tool(
  "ddg_search_news",
  "Search news articles using DuckDuckGo. Returns recent news with sources and dates.",
  {
    query: z.string().min(1).describe("News search query"),
    maxResults: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum news results (default 5)"),
  },
  async ({ query, maxResults }) => {
    try {
      const results = await newsSearch(query, maxResults);

      if (!results || results.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No news results found." }],
        };
      }

      const lines: string[] = [];
      lines.push(`## News Results for "${query}"\n`);

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        lines.push(`### ${i + 1}. ${r.title}`);
        if (r.snippet) lines.push(`${r.snippet}`);
        lines.push(`- **Source**: ${r.source}`);
        lines.push(`- **Date**: ${r.date}`);
        lines.push(`- **URL**: ${r.url}`);
        if (r.image) lines.push(`- ![Thumbnail](${r.image})`);
        lines.push("");
      }

      lines.push(`---\n*${results.length} news articles*`);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching news: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  },
);

// ─── Tool 4: ddg_fetch_content ──────────────────────────────────────────

server.tool(
  "ddg_fetch_content",
  "Fetch and extract main content from a URL. Returns title, description, and text content.",
  {
    url: z.string().url().describe("The URL to fetch content from"),
    maxLength: z
      .number()
      .min(100)
      .max(50000)
      .optional()
      .default(5000)
      .describe("Maximum characters to return (default 5000)"),
  },
  async ({ url, maxLength }) => {
    try {
      const content = await fetchContent(url, maxLength);

      const lines: string[] = [];
      if (content.title) lines.push(`# ${content.title}`);
      if (content.description) lines.push(`> ${content.description}`);
      lines.push(`**URL**: ${content.url}\n`);
      lines.push(content.content);

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching content: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      };
    }
  },
);

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
