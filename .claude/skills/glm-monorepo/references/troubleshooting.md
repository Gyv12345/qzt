# 故障排除指南

## 快速速查表

| # | 错误症状 | 原因 | 解决方案 |
|---|----------|------|----------|
| 1 | 路由匹配失败 `Could not find active match` | `getRouteApi()` 路径末尾多了 `/` | 移除末尾斜杠：`getRouteApi('/path')` |
| 2 | `Query data cannot be undefined` | API 响应拦截器已提取 `data`，代码再次访问 `.data` | 直接返回：`return await api()` |
| 3 | `require is not defined` | 浏览器使用 CommonJS | 用 ES6 `import` |
| 4 | Orval 生成失败 | 后端服务未运行 | `curl http://localhost:7890/api-docs-json` |
| 5 | 404 错误 | API 路径含 `/api` 前缀 | 应为 `http://localhost:7890/users`（无 `/api`） |
| 6 | CORS 错误 | 后端未配置 | `app.enableCors({ origin: 'http://localhost:3456' })` |
| 7 | 401 错误 | Token 未添加 | 检查 localStorage 和拦截器 |
| 8 | `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` | 子项目有 `pnpm-workspace.yaml` | `rm backend/pnpm-workspace.yaml && pnpm install` |
| 9 | IDE 无法识别项目 | `.idea/` 被删除 | `git restore .idea/` |
| 10 | 热重载未生效 | 缓存问题 | `rm -rf frontend/node_modules/.vite && ./start-dev.sh restart` |

## 常见问题

### TanStack Router

**路由匹配失败**
```typescript
// ❌ 错误
const route = getRouteApi('/_authenticated/customers/')

// ✅ 正确
const route = getRouteApi('/_authenticated/customers')
```

**参数类型返回 `unknown`**
```bash
rm src/routeTree.gen.ts && pnpm dev
```

### TanStack Query

**Query data cannot be undefined**
```typescript
// ❌ 错误 - response.data 是 undefined
const response = await api()
return response.data

// ✅ 正确 - 拦截器已提取 data
return await api()
```

### API 调用

**类型错误**
```bash
cd frontend && pnpm run generate:api
```

### 模块依赖注入

**ScheduleModule / BullModule 错误**
- `ScheduleModule.forRoot()` 只在根模块调用一次
- 子模块用 `BullModule.registerQueue()`

**i18n 路径错误**
```typescript
// backend/src/app.module.ts
I18nModule.forRoot({
  loaderOptions: {
    path: path.join(__dirname, '../../src/i18n/'),  // 指向 src/i18n/
  },
})
```

### Workspace 问题

**@qzt/shared-types 无法解析**
```bash
# 删除子项目的 workspace 配置
rm backend/pnpm-workspace.yaml
pnpm install
```

### 项目清理

**节省空间**
```bash
rm -rf website/.next frontend/node_modules/.vite frontend/node_modules/.cache logs/*
find . -name ".DS_Store" -delete && find . -name "*.iml" -delete
```

## 调试命令

```bash
# 检查后端
curl http://localhost:7890/api-docs-json

# 检查生成的 API
ls frontend/src/services/api/

# 重启服务
./start-dev.sh restart
```

## 检查清单

- [ ] 使用 `./start-dev.sh` 启动
- [ ] 后端 7890，前端 3456
- [ ] 已运行 `pnpm run generate:api`
- [ ] API 路径无 `/api` 前缀
- [ ] 使用 `getScrmApi()` 生成的函数
- [ ] 直接返回 API 调用（不访问 `.data`）
- [ ] 使用 ES6 `import`
- [ ] 路由路径无末尾斜杠
- [ ] 子项目无 `pnpm-workspace.yaml`
- [ ] `.idea` 目录存在
