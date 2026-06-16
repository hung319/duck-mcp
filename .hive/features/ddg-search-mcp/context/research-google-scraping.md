## Google Search HTTP-Only Scraping Research

**Date**: 2026-06-16

### Source: deedy5/ddgs Google Engine

- **Repo**: https://github.com/deedy5/ddgs (ddgs/engines/google.py)
- **Endpoint**: `GET https://www.google.com/search`
- **Anti-bot**: Uses `primp` library (Rust-based TLS/HTTP2 impersonation) with `impersonate="random"`, `impersonate_os="random"`
- **Cookies**: Only sets `CONSENT=YES+` for EU consent bypass
- **UA**: Random Android Google App UA (old Chrome versions 39-60)
- **Parsing**: lxml XPath from static HTML — NO JavaScript rendering
- **Missing**: No CAPTCHA handling, no proxy rotation, no retry logic, no JS rendering

### Feasibility Verdict

Google now requires JavaScript to render SERP results (changed 2024-2025). HTTP-only clients (even with perfect TLS impersonation via `primp`) receive an empty JS bootstrap shell. SearXNG community reports ~30-50% CAPTCHA rates even with residential rotating proxies.

### Comparison

| Engine | JS Required | Reliability | Notes |
|--------|------------|-------------|-------|
| Google | Yes | Low (HTTP-only) | Requires Playwright/browser fallback |
| Brave | No | High | Simple GET, works with primp |
| Startpage | No | High | Licensed Google results, POST-based |

### Recommendation

For a production MCP server: use Brave or Startpage engines from ddgs for HTTP-only scraping. For Google results, use a commercial SERP API (SerpApi, DataForSEO) or add Playwright-based browser rendering. Google Custom Search API being shut down Jan 1 2027.
