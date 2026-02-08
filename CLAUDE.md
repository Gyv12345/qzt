# 企智通 (QZT) 开发指南

> 企业客营管理系统 - 全栈开发指南

---

## 环境与配置

**环境限制**：gitworkspace 下不能启动服务，只能开发功能，完成后提 PR 由主分支合并测试。

**技能**：`Skill("glm-monorepo")`

| 项目 | 端口 | 说明 |
|------|------|------|
| 前端 | 3456 | React + Vite |
| 后端 | 7890 | NestJS |
| 网站 | 5180 | Next.js 15 |

**包管理器**：pnpm（npm 很慢）

**启动**：`./start-dev.sh start/stop/restart`

---

## API 开发流程

```
后端开发 API → 生成客户端 → 前端使用
```

1. 后端添加 `@ApiTags('tag-name')` **（必须英文，避免跨平台问题）**
2. `cd frontend && pnpm run generate:api`
3. 更新 `src/services/api/index.ts`
4. 前端调用：`getScrmApi().xxxControllerXxx()`

**响应结构**：API 拦截器已提取 `response.data`，分页为 `{ data, total, page, pageSize, totalPages }`

**HTTP 状态码**：`201` 创建资源 | `200` 非创建 POST | `204` 无返回内容

---

## 前端规范

### React Hooks
- 所有 Hooks 必须在顶层调用
- 条件渲染放在所有 Hooks 之后
```tsx
// ✅ 正确
function Component() {
  const data = useQuery()
  const memoized = useMemo(...)
  if (isLoading) return <Loading />
  return <View />
}

// ❌ 错误：早期返回导致后续 Hooks 不被调用
if (isLoading) return <Loading />
const memoized = useMemo(...)
```

### CRUD 目录结构
```
features/{module}/
├── components/{module}s-table.tsx, {module}s-columns.tsx, {module}-form-drawer.tsx
├── hooks/use-{module}s.ts
├── types/{module}.ts (Zod schema)
└── index.tsx
```

### ES 模块
- ✅ `import { Component } from './Component'`
- ❌ `const { Component } = require('./Component')`（Vite 不支持）

---

## 项目清理

### 快速清理
```bash
rm -rf website/.next frontend/node_modules/.vite frontend/node_modules/.cache logs/*
find . -name ".DS_Store" -delete && find . -name "*.iml" -delete
```

### 可删除文件
| 文件 | 说明 |
|------|------|
| `website/.next/` | 构建产物 |
| `frontend/node_modules/.vite/` | Vite 缓存 |
| `logs/*` | 日志 |
| `.DS_Store`, `*.iml` | 系统/IDE 文件 |
| `package-lock.json` | 冗余（用 pnpm） |

### 必须保留
| 目录 | 原因 |
|------|------|
| `.idea/` | IDE 配置（已入版本控制） |
| `packages/shared-types/` | 共享类型 |

### 依赖版本
```bash
pnpm add -F backend|shadcn-admin|website|shared-types <package>@<version>
# 当前: Zod ^4.3.6, React ^19.2.3-4, Axios ^1.13.4
```

### Workspace 注意事项
- 子项目（如 backend）**不应有** `pnpm-workspace.yaml`
- 会导致 `@qzt/shared-types` 无法解析

---

## 常见错误速查

| # | 错误 | 原因 | 解决方案 |
|---|------|------|----------|
| 1 | `useMemo is not defined` | Hook 未导入 | `import { useMemo } from "react"` |
| 2 | `Cannot find type definition for 'cron'` | 类型包名错误 | `pnpm add -D @types/node-cron`（非 @types/cron） |
| 3 | `PrismaClient' has no exported member` | schema 修改后未生成 | `cd backend && pnpm prisma generate && ./start-dev.sh restart` |
| 4 | `getLoginLogs(...) is not a function` | 工厂函数嵌套调用 | `getScrmApi().loginLogsControllerFindLoginLogs()`（非 `.getLoginLogs().xxx`） |
| 5 | 表格数据为空 | 分页字段名不一致 | Network 确认字段：`data?.data` \| `data?.items` \| `data` |
| 6 | 登录后立即返回登录页 | 用户 status=0 | `UPDATE users SET status = 1 WHERE username = 'admin'` |
| 7 | Windows 下文件名乱码 | `@ApiTags` 用中文 | 改用英文：`@ApiTags('users')` |
| 8 | `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` | 子项目有 pnpm-workspace.yaml | `rm backend/pnpm-workspace.yaml && pnpm install` |
| 9 | 热重载未生效 | 缓存问题 | `rm -rf frontend/node_modules/.vite && ./start-dev.sh restart` |
| 10 | `setTagsManagerOpen is not defined` | 子组件访问父组件未传 props | 通过 props 传递回调函数 |
| 11 | 组件渲染两次 | 组件被重复包裹 | 只在一处包裹 Context/Provider |
| 12 | Next.js 15 类型错误 | params 是 Promise | `const { slug } = await params` |
| 13 | Tailwind v4 类型错误 | darkMode 配置变化 | 改为字符串：`darkMode: "class"` |
| 14 | Fragment 语法错误 | 标签不匹配 | 成对使用 `<Fragment>...</Fragment>` 或 `<>...</>` |
| 15 | IDE 无法识别项目 | `.idea/` 被删除 | `git restore .idea/` |

---

## 代码规范

### 导入顺序
```typescript
// 1. React 核心库
import { useState, useEffect } from "react";
// 2. 第三方库
import { useNavigate } from "@tanstack/react-router";
// 3. 内部组件
import { Button } from "@/components/ui/button";
// 4. 工具/类型
import { cn } from "@/lib/utils";
import type { User } from "@/types";
```

### 文件命名
- 组件: `PascalCase` → `UserTable.tsx`
- Hooks: `camelCase` → `useUsers.ts`
- 常量: `UPPER_SNAKE_CASE`

### 提交格式
```
<type>(<scope>): <subject>
type: feat | fix | refactor | chore | docs | test | style
例: feat(users): add user export functionality
```

---

## 菜单配置

```typescript
{
  title: '系统设置',
  items: [
    { title: '用户管理', url: '/users', icon: Users },
    { title: '日志管理', icon: FileText, items: [
      { title: '登录日志', url: '/login-logs' },
    ]},
  ],
}
```
**规则**：父菜单需 `title+icon+items`，子菜单需 `title+url`，最多 2 级

---

## 数据库

```bash
cd backend && pnpm prisma generate && pnpm prisma db push
```

---

## Website（公司网站）

- Next.js 15 + Tailwind v4 + shadcn/ui
- 端口 5180
- 使用 `fetch` + ISR（不用 Orval）
- 路由：`/`, `/articles`, `/articles/[slug]`, `/cases`, `/cases/[slug]`

```bash
cd website && pnpm dev/build
```

---

## 快速检查清单

### 开发前
- [ ] 后端 API 已开发
- [ ] 已运行 `pnpm run generate:api`
- [ ] 已确认 API 响应结构

### 开发中
- [ ] 使用标准目录结构
- [ ] Hooks 在顶层调用
- [ ] 使用 ES6 `import`

### 完成后
- [ ] 页面正常加载数据
- [ ] CRUD 操作正常
- [ ] 控制台无错误

---

## 性能优化

| 前端 | 后端 |
|------|------|
| react-window 虚拟化 | 数据库索引 |
| useDebounce 防抖 | 分页限制 |
| React.lazy() 懒加载 | Redis 缓存 |
| React Query 缓存 | 连接池优化 |
