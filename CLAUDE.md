# 企账通 (QZT) 开发指南

## 快速开始

| 项目 | 内容 |
|------|------|
| 前端端口 | 3456 |
| 后端端口 | 7890 |
| 启动方式 | `./start-dev.sh` |
| 包管理器 | 使用 `pnpm`（npm 很慢） |

**POST 操作状态码选择**：
- `201 Created` - 创建了新资源（用户注册、创建订单、上传文件）
- `200 OK` - POST 但不是创建资源（登录、触发某个动作）
- `204 No Content` - 处理成功但无需返回内容

---

## API 开发流程

**后端 → 前端开发顺序**：

1. **后端开发 API** → 添加 `@ApiTags('tag-name')`（**必须使用英文**，避免中文导致跨平台兼容性问题）
2. **生成 API 客户端** → `cd frontend && pnpm run generate:api`
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

**响应数据提取**：
- API 拦截器已自动提取 `response.data`
- 分页响应结构：`{ data, total, page, pageSize, totalPages }`

---

## React Hooks 规范

**黄金法则**：所有 Hooks 必须在顶层调用，条件渲染放在所有 Hooks 之后

❌ **错误示例**：
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

✅ **正确示例**：
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
│   ├── {module}-form-dialog.tsx   # 新建/编辑对话框
│   ├── {module}s-primary-buttons.tsx  # 顶部操作按钮
│   ├── {module}s-dialogs.tsx      # 对话框容器
│   └── data-table-row-actions.tsx # 行内操作
├── hooks/                         # 数据管理层
│   └── use-{module}s.ts           # CRUD hooks
├── types/                         # 类型定义层
│   └── {module}.ts                # Zod schema
└── index.tsx                      # 主页面

routes/_authenticated/{module}/
└── route.tsx                      # 路由定义
```

**核心原则**：
- 先查看后端已实现的 API，再设计前端数据结构
- 使用 Orval 生成的类型，不要手动编写 API 调用
- 使用 Zod schema 确保类型安全

---

## API 数据访问

**问题**：后端 API 响应结构不统一

**常见结构**：
```typescript
// 情况 A: data 字段（产品、合同等）
{ "total": 7, "data": [...], "page": 1, "pageSize": 10 }

// 情况 B: items 字段（客户等）
{ "items": [...], "total": 100, "page": 1, "pageSize": 10 }

// 情况 C: 直接返回数组
[...]
```

**调试步骤**：
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

**嵌套菜单实现**：
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

**规则**：
- 父菜单：`title` + `icon` + `items`
- 子菜单：只需 `title` + `url`（不需要 icon）
- 最多支持 2 级嵌套

---

## ES 模块导入规范

**❌ 禁止使用 CommonJS require**：
```typescript
const { Component } = require('./Component')  // ❌ 错误
```

**✅ 必须使用 ES 模块 import**：
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

## 常见问题 Top 6

| 问题 | 解决方案 |
|------|----------|
| **Hooks 早期返回错误** | 将条件渲染移到所有 Hooks 之后 |
| **数据访问错误** | 在 Network 标签查看实际响应（`data` vs `items`） |
| **模块导入错误** | 使用 `import` 而非 `require()` |
| **API 类型过期** | 运行 `cd frontend && pnpm run generate:api` |
| **枚举类型** | 使用字符串枚举（`ACTIVE`/`INACTIVE`），而非数字 |
| **表格数据为空** | 检查 API 返回的字段名是否匹配 |

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
- [ ] 是否运行了 `pnpm run generate:api`？
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
