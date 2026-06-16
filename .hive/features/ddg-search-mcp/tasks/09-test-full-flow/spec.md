# Task: 09-test-full-flow

## Feature: ddg-search-mcp

## Dependencies

- **8. Build MCP Server + Đăng ký Tools** (08-build-mcp-server--ng-k-tools)

## Plan Section

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

## Task Type

testing
