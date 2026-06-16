# Task: 04-implement-qna-answer-tool-qnajs

## Feature: ddg-search-mcp

## Dependencies

- **3. Xây dựng DDG API Client** (03-xy-dng-ddg-api-client)

## Plan Section

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

## Task Type

greenfield
