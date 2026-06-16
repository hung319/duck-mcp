# Task: 01-khi-to-project--dependencies

## Feature: ddg-search-mcp

## Dependencies

_None_

## Plan Section

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

## Task Type

greenfield
