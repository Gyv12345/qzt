# 企智通 (QZT) 开发指南

> 企业客营管理系统 - 全栈开发指南

---

## 环境限制

**重要**：检测当前环境，如果是在 gitworkspace 下运行，则不能启动前后端，否则会导致错误。只能开发功能。开发结束后，提交 PR，由主分支合并之后测试运行。

---

## 技能配置

```yaml
Skill("glm-monorepo")
```

---

## 快速开始

| 项目 | 内容 |
|------|------|
| 前端端口 | 3456 |
| 后端端口 | 7890 |
| 网站端口 | 5180 |
| 启动方式 | `./start-dev.sh` |
| 包管理器 | 使用 `pnpm`（npm 很慢） |

### POST 操作状态码选择

| 状态码 | 使用场景 |
|--------|----------|
| `201 Created` | 创建了新资源（用户注册、创建订单、上传文件） |
| `200 OK` | POST 但不是创建资源（登录、触发某个动作） |
| `204 No Content` | 处理成功但无需返回内容 |

---

## API 开发流程

### 后端 → 前端开发顺序

1. **后端开发 API**
   - 添加 `@ApiTags('tag-name')`
   - **必须使用英文**，避免中文导致跨平台兼容性问题

2. **生成 API 客户端**
   ```bash
   cd frontend && pnpm run generate:api
   ```

3. **手动更新 `src/services/api/index.ts`**
   ```typescript
   import { getLoginLogs } from './login-logs'
   export { getLoginLogs }

   export const getScrmApi = () => ({
     ...getLoginLogs(),  // ✅ 正确：直接展开
   })
   ```

4. **前端使用**
   ```typescript
   // ✅ 正确调用
   getScrmApi().loginLogsControllerFindLoginLogs()

   // ❌ 错误：不要再次调用工厂函数
   // getScrmApi().getLoginLogs().loginLogsControllerFindLoginLogs()
   ```

### 响应数据提取

- API 拦截器已自动提取 `response.data`
- 分页响应结构：`{ data, total, page, pageSize, totalPages }`

---

## React Hooks 规范

### 黄金法则

所有 Hooks 必须在顶层调用，条件渲染放在所有 Hooks 之后。

### ❌ 错误示例

```tsx
function Component() {
  const data = useQuery()
  const [state, setState] = useState()

  if (isLoading) {
    return <Loading />  // ❌ 早期返回导致后续 Hooks 不被调用
  }

  const memoized = useMemo(...)  // Hook 3 - 有时被调用
  return <View />
}
```

### ✅ 正确示例

```tsx
function Component() {
  const data = useQuery()
  const [state, setState] = useState()
  const memoized = useMemo(...)  // 始终调用

  // 条件渲染放在所有 Hooks 之后
  if (isLoading) return <Loading />
  return <View />
}
```

---

## CRUD 目录结构

```
features/{module}/
├── components/                    # UI 组件层
│   ├── {module}s-table.tsx        # 核心表格组件
│   ├── {module}s-columns.tsx      # 列定义
│   ├── {module}-form-drawer.tsx   # 新建/编辑抽屉
│   ├── {module}s-primary-buttons.tsx  # 顶部操作按钮
│   ├── {module}s-drawers.tsx      # 抽屉容器
│   └── data-table-row-actions.tsx # 行内操作
├── hooks/                         # 数据管理层
│   └── use-{module}s.ts           # CRUD hooks
├── types/                         # 类型定义层
│   └── {module}.ts                # Zod schema
└── index.tsx                      # 主页面

routes/_authenticated/{module}/
└── route.tsx                      # 路由定义
```

### 核心原则

- 先查看后端已实现的 API，再设计前端数据结构
- 使用 Orval 生成的类型，不要手动编写 API 调用
- 使用 Zod schema 确保类型安全

---

## API 数据访问

### 问题

后端 API 响应结构不统一

### 常见结构

```typescript
// 情况 A: data 字段（产品、合同等）
{ "total": 7, "data": [...], "page": 1, "pageSize": 10 }

// 情况 B: items 字段（客户等）
{ "items": [...], "total": 100, "page": 1, "pageSize": 10 }

// 情况 C: 直接返回数组
[...]
```

### 调试步骤

1. 打开浏览器开发者工具 → Network 标签
2. 找到对应的 API 请求
3. 查看 Response 中的实际数据结构
4. 根据实际字段名访问数据

```typescript
// 根据实际 API 响应访问
const products = data?.data || []     // 产品、合同等
const customers = data?.items || []    // 客户
const roles = data || []               // 直接返回数组
```

---

## 菜单结构配置

### 嵌套菜单实现

```typescript
{
  title: '系统设置',
  items: [
    { title: '用户管理', url: '/users', icon: Users },
    {
      title: '日志管理',  // 父菜单
      icon: FileText,     // 父菜单需要 icon
      items: [            // 子菜单数组
        { title: '登录日志', url: '/login-logs' },
        { title: '操作日志', url: '/operation-logs' },
      ],
    },
  ],
}
```

### 规则

| 菜单类型 | 必需字段 |
|----------|----------|
| 父菜单 | `title` + `icon` + `items` |
| 子菜单 | `title` + `url`（不需要 icon） |

- 最多支持 2 级嵌套

---

## ES 模块导入规范

### ❌ 禁止使用 CommonJS require

```typescript
const { Component } = require('./Component')  // ❌ 错误
```

### ✅ 必须使用 ES 模块 import

```typescript
import { Component } from './Component'  // ✅ 正确
```

**原因**：Vite 使用 ES 模块系统，不支持 `require()`

---

## 数据库迁移流程

```bash
# 开发环境快速迁移
pnpm prisma generate  # 生成 Prisma 客户端
pnpm prisma db push   # 推送 schema 到数据库

# 生产环境
mkdir -p prisma/migrations/TIMESTAMP_description
# 创建 migration.sql
pnpm prisma migrate deploy
```

---

## 实用命令

```bash
# API 相关
cd frontend && pnpm run generate:api
curl -s http://localhost:7890/api-docs-json | jq '.'

# 查看生成的 API 文件
ls frontend/src/services/api/
cat frontend/src/models/createProductDto.ts

# 数据库
cd backend && pnpm prisma generate && pnpm prisma db push

# 服务控制
./start-dev.sh start    # 启动前后端
./start-dev.sh stop     # 停止服务
./start-dev.sh restart  # 重启服务
```

---

## 快速检查清单

### 开发前

- [ ] 后端 API 是否已开发？
- [ ] 是否运行了 `cd frontend && pnpm run generate:api`？
- [ ] 是否查看了 `src/services/api/` 中的 API 文件？
- [ ] 是否确认了 API 返回的数据结构？

### 开发中

- [ ] 是否使用了标准目录结构？
- [ ] Hooks 是否都在顶层调用？
- [ ] 是否使用了 `import` 而非 `require()`？

### 完成后

- [ ] 前端页面能正常加载数据？
- [ ] CRUD 操作都能正常工作？
- [ ] 控制台无错误或警告？
- [ ] API 调用成功（Network 标签验证）？

---

## 常见错误与经验教训

### 1. React Hooks 导入遗漏

**错误现象**：
```
ReferenceError: useMemo is not defined
```

**原因**：使用了 Hook 但忘记在 import 语句中声明

**解决方案**：
```tsx
// ❌ 错误
import { useEffect, useState } from "react";
const columns = useMemo(() => [...], [deps]);

// ✅ 正确
import { useEffect, useState, useMemo } from "react";
const columns = useMemo(() => [...], [deps]);
```

**预防**：使用 ESLint 规则 `react-hooks/exhaustive-deps` 自动检测

---

### 2. TypeScript 类型包选择错误

**错误现象**：
```
TS2688: Cannot find type definition file for 'cron'.
```

**原因**：项目使用 `node-cron` 包，但错误安装了 `@types/cron`

**解决方案**：
```bash
# ❌ 错误：node-cron 不对应 @types/cron
pnpm add -D @types/cron

# ✅ 正确：使用对应的类型包
pnpm add -D @types/node-cron
```

**经验**：类型包名称通常与运行时包名称一致，注意前缀 `@types/`

---

### 3. Prisma Client 未生成

**错误现象**：
```
Module '"@prisma/client"' has no exported member 'PrismaClient'
后端编译失败，所有 API 返回 500
```

**原因**：修改 schema 后未重新生成 Prisma Client

**解决方案**：
```bash
cd backend && pnpm prisma generate
./start-dev.sh restart
```

**预防**：将 `prisma generate` 添加到 postinstall 钩子

---

### 4. API 调用工厂函数重复调用

**错误现象**：
```
TypeError: getLoginLogs(...) is not a function
```

**原因**：错误地嵌套调用工厂函数

**解决方案**：
```typescript
// ❌ 错误：重复调用工厂函数
getScrmApi().getLoginLogs().loginLogsControllerFindLoginLogs()

// ✅ 正确：只调用一次工厂函数
getScrmApi().loginLogsControllerFindLoginLogs()
```

---

### 5. 分页数据字段名不一致

**错误现象**：
```
表格数据为空，但 API 返回有数据
```

**原因**：后端不同接口返回的分页结构字段名不同

**解决方案**：
```typescript
// 先在 Network 标签确认实际字段名
const data = response?.data || []   // 产品、合同等
const items = response?.items || [] // 客户等
const list = response || []         // 直接返回数组
```

**长期方案**：后端统一响应格式

---

### 6. 用户状态禁用导致登录失败

**错误现象**：
```
登录后立即返回登录页，或显示 "账号已被禁用"
```

**原因**：测试用户 status 字段为 0（禁用状态）

**解决方案**：
```sql
-- 检查用户状态
SELECT id, username, status FROM users WHERE username = 'admin';

-- 启用用户
UPDATE users SET status = 1 WHERE username = 'admin';
```

---

### 7. Git 提交粒度过大

**问题**：单次提交包含多个不相关的修改

**影响**：
- 代码审查困难
- 回滚时影响范围过大
- 难以追踪问题引入时机

**最佳实践**：
```bash
# 按功能模块分别提交
git add backend/src/modules/auth/ && git commit -m "feat(auth): ..."
git add backend/src/modules/users/ && git commit -m "feat(users): ..."

# 每个提交只做一件事
```

---

### 8. 中文件名导致的跨平台问题

**错误现象**：
```
Windows 下 Orval 生成的文件名乱码或路径错误
```

**原因**：`@ApiTags()` 使用了中文标签

**解决方案**：
```typescript
// ❌ 错误：中文标签
@ApiTags('用户管理')
@ApiTags('登录日志')

// ✅ 正确：英文标签
@ApiTags('users')
@ApiTags('login-logs')
```

---

### 9. 依赖安装顺序问题

**错误现象**：
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND
```

**原因**：在子目录直接安装依赖，而非根目录

**解决方案**：
```bash
# ✅ 正确：从根目录安装
cd /path/to/qzt
pnpm install

# ❌ 错误：从子目录安装
cd backend && pnpm install
```

---

### 10. 热重载未生效

**现象**：修改代码后刷新页面，行为未改变

**原因**：
- 后端：NestJS watch 模式未正确触发
- 前端：Vite 缓存问题

**解决方案**：
```bash
# 后端：重启开发服务
./start-dev.sh restart

# 前端：清除缓存重启
cd frontend && rm -rf node_modules/.vite && pnpm dev
```

---

### 11. 子组件访问父组件状态导致 ReferenceError

**错误现象**：
```
ReferenceError: setTagsManagerOpen is not defined
```

**原因**：子组件直接使用父组件中定义的 state setter，但该变量未通过 props 传递

**解决方案**：
```tsx
// ❌ 错误：子组件直接使用父组件的变量
function Parent() {
  const [open, setOpen] = useState(false)
  return <Child onClick={() => setOpen(true)} />
}

function Child({ onClick }) {
  return <button onClick={() => setOpen(true)}>  // ReferenceError!
    Open
  </button>
}

// ✅ 正确：通过 props 传递回调函数
function Parent() {
  const [open, setOpen] = useState(false)
  const handleOpen = useCallback(() => setOpen(true), [])
  return <Child onOpen={handleOpen} />
}

function Child({ onOpen }) {
  return <button onClick={onOpen}>Open</button>
}
```

**预防**：子组件只能访问通过 props 传递的值，使用回调模式实现子组件向父组件通信

---

### 12. 组件重复包裹导致双重渲染

**错误现象**：
```
组件渲染两次，状态管理混乱，重复 API 调用
```

**原因**：同一组件在不同层级被重复包裹

**解决方案**：
```tsx
// ❌ 错误：CmsDrawers 和 CmsTagsManager 被包裹两次
function Parent() {
  return (
    <CmsDrawers>
      <Child />
      <CmsTagsManager />
    </CmsDrawers>
  )
}

function Child() {
  return (
    <CmsDrawers>  {/* 重复！ */}
      <CmsTagsManager />
    </CmsDrawers>
  )
}

// ✅ 正确：只在一处包裹
function Parent() {
  return (
    <CmsDrawers>
      <Child />
      <CmsTagsManager />
    </CmsDrawers>
  )
}

function Child() {
  return <div>{/* 不再重复包裹 */}</div>
}
```

**预防**：使用 React DevTools 的 Profiler 检测组件重复渲染

---

### 13. Next.js 15 Async Params

**错误现象**：
```
Type error: Type '{ slug: string }' does not satisfy the constraint 'PageProps'
```

**原因**：Next.js 15 中，动态路由的 `params` 和 `searchParams` 现在是 Promise

**解决方案**：
```tsx
// ❌ 错误：直接解构 params
export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params
}

// ✅ 正确：await params
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
}
```

---

### 14. Tailwind v4 配置变化

**错误现象**：
```
Type error: Type '["class"]' is not assignable to type 'DarkModeStrategy'
```

**原因**：Tailwind v4 的 `darkMode` 配置从数组改为字符串

**解决方案**：
```typescript
// ❌ Tailwind v3
export default {
  darkMode: ["class"],  // 数组
}

// ✅ Tailwind v4
export default {
  darkMode: "class",  // 字符串
}
```

---

### 15. CORS 配置重复

**错误现象**：
```
allowedOrigins 数组中有重复的 URL
```

**原因**：硬编码和环境变量默认值重复

**解决方案**：
```typescript
// ❌ 错误：重复定义
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3456",
  process.env.WEBSITE_URL || "http://localhost:5180",
  "http://localhost:5180",  // 重复!
  "http://localhost:3456",  // 重复!
]

// ✅ 正确：使用 Set 去重
const allowedOrigins = Array.from(new Set([
  process.env.FRONTEND_URL || "http://localhost:3456",
  process.env.WEBSITE_URL || "http://localhost:5180",
]))
```

---

### 16. Fragment 闭合标签不匹配

**错误现象**：
```
SyntaxError: Expression expected
x Expression expected
  277 |     </>
      :       ^
  278 |   );
```

**原因**：混用了 Fragment 的完整形式 `<Fragment>` 和简写闭合标签 `</>`

**解决方案**：
```tsx
// ❌ 错误：开头用完整形式，结尾用简写
return (
  <Fragment>
    <div>Content</div>
  </>
)

// ✅ 正确：全程使用完整形式
return (
  <Fragment>
    <div>Content</div>
  </Fragment>
)

// ✅ 正确：全程使用简写形式
return (
  <>
    <div>Content</div>
  </>
)
```

**经验**：Fragment 的开闭标签必须成对使用完整形式 `<Fragment>...</Fragment>` 或简写形式 `<>...</>`，不能混用。

---

## 代码风格规范

### 导入顺序

```typescript
// 1. React 核心库
import { useState, useEffect } from "react";

// 2. 第三方库（按字母顺序）
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

// 3. 内部组件
import { Button } from "@/components/ui/button";

// 4. 工具函数
import { cn } from "@/lib/utils";

// 5. 类型
import type { User } from "@/types";
```

### 文件命名

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `UserTable.tsx` |
| Hooks | camelCase | `useUsers.ts` |
| 工具 | camelCase | `formatDate.ts` |
| 类型 | PascalCase | `User.ts` |
| 常量 | UPPER_SNAKE_CASE | `API_BASE_URL.ts` |

### 提交信息格式

```
<type>(<scope>): <subject>

type: feat | fix | refactor | chore | docs | test | style
scope: 模块名（可选）
subject: 简短描述（不超过 50 字符）

示例：
feat(users): add user export functionality
fix(auth): resolve token refresh issue
refactor(frontend): standardize API service imports
```

---

## 环境变量管理

### 后端 (.env)

```bash
# 数据库
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# 服务端口
PORT=7890
```

### 前端 (.env)

```bash
# API 地址
VITE_API_BASE_URL="http://localhost:7890"

# 其他配置
VITE_APP_TITLE="企智通"
```

---

## 调试技巧

```typescript
// 后端：NestJS 日志
this.logger.log('[UserInfo]', user);
this.logger.error('[Error]', error);

// 前端：API 调用日志
console.log('[API Request]', { url, params });
console.log('[API Response]', data);

// 网络请求拦截器
instance.interceptors.request.use(config => {
  console.log('[Request]', config);
  return config;
});
```

---

## 性能优化建议

| 前端 | 后端 |
|------|------|
| 列表虚拟化：`react-window` | 数据库索引 |
| 搜索防抖：`useDebounce` | 分页限制 |
| 路由懒加载：`React.lazy()` | 连接池优化 |
| React Query 缓存 | Redis 缓存 |

---

## Website（公司网站）开发

### 项目概述

`website/` 是独立的 Next.js 15 项目，用于展示 CMS 公开内容（文章、案例等）。

### 技术栈

- **框架**: Next.js 15 (App Router) + TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui
- **动画**: Framer Motion
- **端口**: 5180

### 开发命令

```bash
# 开发环境
cd website && pnpm dev

# 生产构建
cd website && pnpm build

# Docker 部署
docker compose -f docker/docker-compose.prod.yml up website
```

### CMS API 集成

网站使用 Next.js 的 `fetch` 配合 ISR（增量静态再生成）从后端获取内容：

```typescript
// website/lib/api.ts
export async function getArticles(params?: { page?: number }) {
  const res = await fetch(`${API_BASE_URL}/public/cms/articles`, {
    next: { revalidate: 3600 }, // ISR: 每小时刷新
  })
  return res.json()
}
```

**注意**: Website 项目是独立的展示网站，不使用 Orval 生成的 API（那是 frontend 管理后台专用的）。

### 路由结构

```
/                    # 首页
/articles            # 文章列表
/articles/[slug]     # 文章详情
/cases               # 案例列表
/cases/[slug]        # 案例详情
```

### 环境变量

```bash
# website/.env.local
NEXT_PUBLIC_API_URL=http://localhost:7890
PORT=5180
```
