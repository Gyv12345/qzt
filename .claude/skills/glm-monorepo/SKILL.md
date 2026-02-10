---
name: glm-monorepo
description: 企智通项目全栈开发。后端 NestJS + Prisma，前端 React + TanStack Router + Shadcn UI。核心约定：CRUD 用抽屉、头部含搜索/主题/i18n/用户、文本 i18n 化、@ApiTags 英文、分页响应用 data 字段。开发前后端功能时使用此技能。
---

## 快速开始

```bash
./start-dev.sh    # 启动（前端 3456，后端 7890，网站 5180）
```

## 开发流程

```
后端开发 API → 生成客户端 → 前端使用
```

1. 后端添加 `@ApiTags('tag-name')` **（必须英文）**
2. `cd frontend && pnpm run generate:api`
3. 前端使用生成的 API 和类型

**注意**：前端禁止手写 API 调用代码！必须使用 Orval 生成的类型安全 API。

## 核心约定（强制）

### 后端
| 约定 | 规则 |
|------|------|
| 分页响应 | `{ data, total, page, pageSize, totalPages }` - 必须用 `data` 字段 |
| @ApiTags | 英文：`@ApiTags('contacts')`，中文会导致跨平台问题 |
| 错误信息 | `this.i18n.t('common.BAD_REQUEST')` |
| HTTP 状态码 | `201` 创建 \| `200` 非创建 POST \| `204` 无返回 |

### 前端
| 约定 | 规则 |
|------|------|
| CRUD 表单 | **必须用 Sheet/Drawer 抽屉**，禁止 Dialog |
| 页面头部 | **必须包含** Search + ThemeSwitch + LanguageSwitch + ConfigDrawer + ProfileDropdown |
| 文本 i18n | `t("module.title")`，禁止硬编码中文 |
| 分页数据 | `data?.data`（非 `items`/`records`） |
| API 调用 | `getScrmApi().xxxControllerXxx()` - 不要再次调用工厂函数 |
| 删除确认 | 用 AlertDialog，禁用 `window.confirm` |
| Hooks 规则 | 所有 Hooks 顶层调用，条件渲染放最后 |

### React Hooks
```tsx
// ✅ Hooks 始终在顶层
function Component() {
  const data = useQuery()
  const memoized = useMemo(...)
  if (isLoading) return <Loading />  // 条件放最后
}

// ❌ 早期返回破坏 Hooks
if (isLoading) return <Loading />
const memoized = useMemo(...)
```

## 目录结构

```
backend/src/modules/{module}/
├── {module}.controller.ts
├── {module}.service.ts
├── {module}.module.ts
└── dto/
    ├── create-{module}.dto.ts
    ├── update-{module}.dto.ts
    └── query-{module}.dto.ts

frontend/src/features/{module}/
├── index.tsx
├── types/{module}.ts          # Zod schema
├── hooks/use-{module}s.ts     # API hooks
└── components/
    ├── {module}s-table.tsx
    ├── {module}s-columns.tsx
    ├── {module}s-primary-buttons.tsx
    ├── {module}-form-drawer.tsx  # 表单抽屉
    └── data-table-row-actions.tsx
```

## 常用命令

```bash
# API 生成
cd frontend && pnpm run generate:api

# 数据库
cd backend && pnpm prisma generate && pnpm prisma db push

# 项目清理
rm -rf website/.next frontend/node_modules/.vite frontend/node_modules/.cache logs/*
```

## 项目维护

### 可安全删除
| 文件 | 说明 |
|------|------|
| `website/.next/` | 构建产物 |
| `frontend/node_modules/.vite/` | Vite 缓存 |
| `logs/*`, `.DS_Store`, `*.iml` | 日志/系统文件 |
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
- 子项目**不应有** `pnpm-workspace.yaml`（会导致 `@qzt/shared-types` 无法解析）
- `.idea/` 误删：`git restore .idea/`

## 检查清单

### 后端
- [ ] 分页用 `data` 字段
- [ ] `@ApiTags` 英文
- [ ] 错误用 `this.i18n.t()`

### 前端
- [ ] CRUD 用抽屉
- [ ] 头部含 Search/Theme/i18n/User
- [ ] 文本用 `t()` i18n
- [ ] 分页用 `data?.data`
- [ ] Hooks 顶层调用
- [ ] 删除用 AlertDialog

## 参考文档

| 文档 | 内容 |
|------|------|
| [contacts-crud-template.md](./references/contacts-crud-template.md) | CRUD 完整模板 |
| [pagination-response-standard.md](./references/pagination-response-standard.md) | 分页响应规范 |
| [troubleshooting.md](./references/troubleshooting.md) | 故障排除 |

## Zod v4 关键知识

项目使用 Zod ^4.3.6，shared-types 包中的 schema 必须遵循 v4 语法：

### 枚举验证消息

```typescript
// ✅ Zod v4
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  message: '状态必须是 ACTIVE 或 INACTIVE',
})

// ❌ Zod v3（已废弃）
export const statusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  errorMap: () => ({ message: '状态必须是 ACTIVE 或 INACTIVE' }),
})
```

### ZodError API

```typescript
// ✅ Zod v4
result.error.issues  // 错误列表

// ❌ Zod v3（已废弃）
result.error.errors
```

### record() 必须指定两个参数

```typescript
// ✅ Zod v4
context: z.record(z.string(), z.unknown()).optional()

// ❌ Zod v3（已废弃）
context: z.record(z.any()).optional()
```

### shared-types 构建失败时

```bash
cd packages/shared-types && pnpm build
```

如果构建失败，通常是因为：
1. schema 文件中存在 `errorMap` 语法
2. `z.record()` 只有一个参数
3. `z.ZodError.errors` 被使用

修复后需重启：`./start-dev.sh restart`
