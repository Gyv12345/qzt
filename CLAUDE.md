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
rm -rf frontend/node_modules/.vite frontend/node_modules/.cache logs/*
find . -name ".DS_Store" -delete && find . -name "*.iml" -delete
```

### 可删除文件
| 文件 | 说明 |
|------|------|
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
pnpm add -F backend|shadcn-admin|shared-types <package>@<version>
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
| 16 | `Zod3Type` 类型错误 | @hookform/resolvers 与 Zod v4 不兼容 | 见下方「Zod v4 兼容性」 |
| 17 | `userControllerFindAll does not exist` | API 方法名单复数错误 | 使用 `usersControllerFindAll`（复数），非 `userController` |
| 18 | `TS6133: 't' is never read` | i18n 的 `t` 未使用 | 用 `t()` 替换硬编码文本，**不要移除** `t` |

---

## Zod v4 兼容性

**问题**：`@hookform/resolvers@5.2.2` 对 Zod v4 的类型定义支持不完整，导致 `zodResolver` 报 TypeScript 类型错误。

**解决方案**（使用统一兼容层）：
```typescript
// ✅ 使用项目兼容层
import { zodResolver } from "@/lib/zod-resolver";

const form = useForm({
  resolver: zodResolver(schema),  // 无需 as any
});
```

**兼容层实现** (`frontend/src/lib/zod-resolver.ts`)：
```typescript
import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodResolver<TInput extends z.ZodTypeAny, TContext = unknown>(
  schema: TInput,
  ...args: Parameters<typeof baseZodResolver>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return baseZodResolver(schema as any, ...args) as any;
}
```

**说明**：
- 统一封装类型断言，避免在每个表单中重复
- 仅绕过编译时类型检查，运行时验证完全正常
- 追踪问题：[react-hook-form/resolvers#813](https://github.com/react-hook-form/resolvers/issues/813)
- 清理时机：等待 `@hookform/resolvers` 发布 Zod v4 兼容版本后删除兼容层

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

## i18n 国际化

### 基本原则
- **所有用户可见文本必须 i18n 化**，禁止硬编码中文
- 使用 `react-i18next` 的 `useTranslation` Hook
- 翻译文件位于 `src/i18n/locales/{lang}/translation.json`

### 使用方式
```tsx
import { useTranslation } from "react-i18next";

function Component() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("module.key")}</h1>
      <p>{t("module.key.withParam", { count: 5 })}</p>
    </div>
  );
}
```

### 翻译 Key 命名规范
```json
{
  "module": {
    "title": "模块标题",
    "columns": {
      "name": "名称",
      "status": "状态"
    },
    "actions": {
      "create": "新建",
      "edit": "编辑",
      "delete": "删除"
    },
    "messages": {
      "success": "操作成功",
      "failed": "操作失败"
    }
  }
}
```

### 常见错误处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `TS6133: 't' is declared but its value is never read` | 引入了 `t` 但未使用 | 用 `t()` 替换所有硬编码文本，**不要**移除 `t` |
| 翻译 key 拼写错误 | 无 IDE 自动补全 | 先查看现有翻译文件，保持命名一致性 |
| 插值变量缺失 | 使用 `{{var}}` 但未传值 | `t("key", { var: value })` |

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

---

## RBAC 权限系统

### 权限代码命名规范

格式：`资源:操作`（如 `contacts:view`）

### 权限清单（按实际页面功能）

> ⚠️ **重要**：添加新菜单或按钮时，必须同步更新此清单！

| 页面 | 权限代码 | 说明 |
|------|---------|------|
| **联系人** | `contacts:view` | 查看列表 |
| | `contacts:create` | 新建联系人 |
| | `contacts:edit` | 编辑 |
| | `contacts:delete` | 删除 |
| | `contacts:export` | 导出 |
| | `contacts:import` | 导入 |
| | `contacts:history` | 历史记录 |
| | `contacts:linkCustomer` | 关联客户 |
| **客户** | `customers:view` | 查看列表 |
| | `customers:create` | 新建客户 |
| | `customers:edit` | 编辑 |
| | `customers:delete` | 删除 |
| | `customers:export` | 导出 |
| | `customers:import` | 导入 |
| | `customers:batchUpdate` | 批量更新 |
| | `customers:batchAssign` | 批量分配 |
| **合同** | `contracts:view` | 查看列表 |
| | `contracts:create` | 新建合同 |
| | `contracts:edit` | 编辑 |
| | `contracts:delete` | 删除 |
| | `contracts:updatePayment` | 更新收款状态 |
| | `contracts:detail` | 查看详情 |
| **服务团队** | `service-teams:view` | 查看列表 |
| | `service-teams:create` | 添加成员 |
| | `service-teams:edit` | 编辑 |
| | `service-teams:delete` | 删除 |
| **发票** | `invoices:view` | 查看列表 |
| | `invoices:create` | 新建开票 |
| | `invoices:edit` | 编辑 |
| | `invoices:delete` | 删除 |
| | `invoices:detail` | 查看详情 |
| **收款** | `payments:view` | 查看列表 |
| | `payments:create` | 新建收款 |
| | `payments:edit` | 编辑 |
| | `payments:delete` | 删除 |
| | `payments:confirm` | 确认收款 |
| | `payments:detail` | 查看详情 |
| **内容管理** | `cms:view` | 查看列表 |
| | `cms:create` | 新建内容 |
| | `cms:edit` | 编辑 |
| **产品** | `products:view` | 查看列表 |
| | `products:create` | 新建产品 |
| | `products:edit` | 编辑 |
| | `products:delete` | 删除 |
| | `products:detail` | 查看详情 |
| **合同模板** | `contract-templates:view` | 查看列表 |
| | `contract-templates:create` | 新建合同模板 |
| | `contract-templates:edit` | 编辑 |
| | `contract-templates:preview` | 预览 |
| **Webhook** | `webhooks:view` | 查看列表 |
| | `webhooks:create` | 添加配置 |
| **用户** | `users:view` | 查看列表 |
| | `users:create` | 新建用户 |
| | `users:createBatch` | 批量添加 |
| | `users:edit` | 编辑 |
| | `users:delete` | 删除 |
| **角色** | `roles:view` | 查看列表 |
| | `roles:create` | 新建角色 |
| | `roles:edit` | 编辑 |
| | `roles:delete` | 删除 |
| **日志类** | `login-logs:view` | 查看登录日志 |
| | `operation-logs:view` | 查看操作日志 |
| | `system-logs:view` | 查看系统日志 |

### 无操作按钮的页面

以下页面仅有 `:view` 权限：
- 客户规则 (`customer-rules:view`)
- 部门管理 (`departments:view`)
- 登录日志、操作日志、系统日志

### 权限初始化

权限数据在应用启动时通过 `MenuService.initializeMenus()` 自动初始化，使用 `upsert` 模式避免重复创建。

### 添加新权限的流程

1. 前端添加新按钮/功能
2. 在上方清单中添加对应的权限代码
3. 后端 `MenuService.initializeMenus()` 中添加权限定义
4. 重新启动后端服务，权限自动同步到数据库
