# 重要

1.没有要求不要生成文档

2.快速开发代码，快速进行验证，快速失败，快速迭代

3.npm 很慢，都使用pnpm

4.开始时候，如果需要启动 前后端，或者重启前后端，或者执行什么操作，使用strt-dev.sh处理。

5.对于任何任务，优先选择检索主导的推理，而非预训练主导的推理

7.前端 3456 后端 7890

8.Skill("qzt-dev")


9.POST 操作状态码选择：
    - 201 Created - 创建了新资源（用户注册、创建订单、上传文件）
  - 200 OK - POST 但不是创建资源（登录、触发某个动作）
  - 204 No Content - 处理成功但无需返回内容

---

## 核心开发经验

### API 开发流程（Orval 自动生成）

**后端 → 前端开发顺序**：
1. 后端开发 API 接口，使用 `@ApiTags('tag-name')` 定义标签
   - ⚠️ **必须使用英文 Tags**（如 `auth`、`users`、`login-logs`）
   - Tags 直接映射为前端 API 文件名，中文会导致跨平台兼容性问题

2. 后端 Swagger 自动生成文档：`http://localhost:7890/api-docs-json`

3. 前端生成 API 客户端：`cd frontend && pnpm run generate:api`
   - Orval 从 Swagger 自动生成类型安全的 API 客户端
   - 生成文件位置：`src/services/api/*.ts`

4. **关键步骤**：手动更新 `src/services/api/index.ts`
   ```typescript
   // 1. 导入生成的模块
   import { getLoginLogs } from './login-logs'

   // 2. 导出模块
   export { getLoginLogs }

   // 3. 在 getScrmApi() 中展开
   export const getScrmApi = () => ({
     ...getLoginLogs(),  // ✅ 正确：直接展开
     // ❌ 错误：getLoginLogs
   })
   ```

5. 前端使用生成的 API：
   ```typescript
   import { getScrmApi } from '@/services/api'

   // ✅ 正确调用方式
   const { data } = useQuery({
     queryFn: () => getScrmApi().loginLogsControllerFindLoginLogs()
   })

   // ❌ 错误：不要再次调用工厂函数
   // getScrmApi().getLoginLogs().loginLogsControllerFindLoginLogs()
   ```

**响应数据提取**：
- API 拦截器已自动提取 `response.data`
- 分页响应结构：`{ data, total, page, pageSize, totalPages }`
- 直接使用 `response?.data` 即可，不需要手动解析

### React Hooks 开发规范

**黄金法则**：Hooks 必须在组件顶层调用，调用顺序必须固定

❌ **错误示例**（违反 Hooks 规则）：
```tsx
function Component() {
  const data = useQuery()  // Hook 1
  const [state, setState] = useState()  // Hook 2

  if (isLoading) {
    return <Loading />  // ❌ 早期返回导致后续 Hooks 不被调用
  }

  const memoized = useMemo(...)  // Hook 3 - 有时被调用，有时不调用
  return <View />
}
```

✅ **正确示例**（所有 Hooks 在顶层）：
```tsx
function Component() {
  const data = useQuery()  // Hook 1
  const [state, setState] = useState()  // Hook 2
  const memoized = useMemo(...)  // Hook 3 - 始终调用

  // 条件渲染放在所有 Hooks 之后
  if (isLoading) return <Loading />
  return <View />
}
```

**常见错误**：
- 在条件语句中提前返回
- 在循环中调用 Hooks
- 在嵌套函数中调用 Hooks

### 菜单结构配置

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

### 登录日志实现要点

**数据模型**：
```prisma
model LoginLog {
  id         String   @id @default(cuid())
  userId     String
  username   String
  email      String?
  ip         String?
  userAgent  String?
  browser    String?
  os         String?
  status     String   // SUCCESS, FAILED
  failReason String?
  createdAt  DateTime @default(now())
}
```

**关键实现**：
1. **登录时记录**：在 `AuthService.login()` 中调用 `LoginLogsService`
2. **成功和失败都要记录**：区分 `INVALID_CREDENTIALS` 和 `ACCOUNT_DISABLED`
3. **解析 UserAgent**：
   - 浏览器：Chrome、Firefox、Safari、Edge
   - 操作系统：Windows、macOS、Linux、iOS、Android
4. **IP 获取**：从请求对象 `req.ip` 或 `req.connection.remoteAddress` 获取

**Controller 层传递上下文**：
```typescript
async login(
  @Body() loginDto: LoginDto,
  @Req() req: any,
  @Headers('user-agent') userAgent?: string,
) {
  const ip = req.ip || req.connection.remoteAddress
  return this.authService.login(loginDto, { ip, userAgent })
}
```

### 数据库迁移流程

**开发环境快速迁移**：
```bash
# 1. 修改 prisma/schema.prisma
# 2. 生成 Prisma 客户端
pnpm prisma generate

# 3. 推送 schema 到数据库（开发环境）
pnpm prisma db push

# 或者手动创建迁移文件（生产环境）
mkdir -p prisma/migrations/TIMESTAMP_description
# 创建 migration.sql
# 然后运行 pnpm prisma migrate deploy
```

### 前后端 API 契约匹配流程

**核心原则**：当前端使用某个 service 调用时，必须查找关联的请求和返回字段，然后跟当前功能关联。

**完整的开发流程**：

#### 步骤 1: 查看后端 API 实现
```bash
# 1. 找到对应的 Controller 文件
find backend/src -name "*controller.ts"

# 2. 查看 API 方法的实际实现
# 例如：findAllRoles()
```

**关键检查点**：
- ✅ 方法接受哪些参数？
- ✅ 参数是必需的还是可选的？
- ✅ 返回什么数据结构（数组/分页对象/单个对象）？
- ✅ 是否有 `@ApiQuery()` 装饰器定义查询参数？

#### 步骤 2: 查看 Orval 生成的类型定义
```bash
# 1. 找到生成的 API 文件
ls frontend/src/services/api/

# 2. 查看类型定义文件
cat frontend/src/models/*Controller*.ts
```

**关键检查点**：
- ✅ 方法签名中的参数类型
- ✅ 返回类型定义
- ✅ 字段是否可选

**示例**：
```typescript
// frontend/src/models/permissionControllerFindAllPermissionsParams.ts
export type PermissionControllerFindAllPermissionsParams = {
  type: string;  // ✅ 只有 type 字段，没有 page、pageSize
};

// frontend/src/services/api/permissions.ts
const permissionControllerFindAllRoles = () => {
  return customInstance<void>({
    url: `/permissions/roles`,
    method: "GET"
  });  // ✅ 没有参数
};
```

#### 步骤 3: 编写前端 Hooks

根据步骤 1 和 2 的信息，编写正确的 hooks：

**❌ 错误示例**（假设后端支持分页，实际不支持）：
```typescript
export function useRoles(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['roles', params],
    queryFn: async () => {
      return await getScrmApi().permissionControllerFindAllRoles(params)
      // ❌ 传递了不存在的参数
    },
  })
}

// 组件中使用
const { data } = useRoles({ page: 1, pageSize: 10 })
const tableData = data?.data || []  // ❌ 期望分页结构
```

**✅ 正确示例**（根据实际后端实现）：
```typescript
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      return await getScrmApi().permissionControllerFindAllRoles()
      // ✅ 不传递参数
    },
  })
}

// 组件中使用
const { data } = useRoles()
const tableData = data || []  // ✅ 直接使用数组
```

#### 步骤 4: 组件中正确使用数据

根据返回类型使用数据：

**情况 A: 后端返回分页对象**
```typescript
// 后端：{ data: [...], total, page, pageSize, totalPages }
const { data } = useQuery(...)
const tableData = data?.data || []  // 访问 data 字段
const total = data?.total || 0
```

**情况 B: 后端返回数组**
```typescript
// 后端：[{...}, {...}, {...}]
const { data } = useQuery(...)
const tableData = data || []  // 直接使用
```

**情况 C: 后端返回单个对象**
```typescript
// 后端：{ id, name, ... }
const { data } = useQuery(...)
const item = data  // 直接使用
```

#### 常见不匹配案例

**案例 1: 参数不匹配**
```typescript
// 后端定义（不支持分页）
findAllRoles()

// ❌ 前端错误调用
getScrmApi().permissionControllerFindAllRoles({ page: 1, pageSize: 10 })

// ✅ 前端正确调用
getScrmApi().permissionControllerFindAllRoles()
```

**案例 2: 数据结构不匹配**
```typescript
// 后端返回：[{ id, name, ... }]
// ❌ 前端错误访问
data?.data  // undefined

// ✅ 前端正确访问
data || []
```

**案例 3: 字段类型不匹配**
```typescript
// 后端：keyword?: string（可选）
// ❌ 前端错误传递
{ keyword: undefined }  // 可能导致查询参数 ?keyword=undefined

// ✅ 前端正确传递
{ keyword: searchTerm || undefined }  // 只在有值时传递
```

#### 快速排查检查清单

当功能不工作时，按以下顺序排查：

- [ ] 1. 后端 Controller 方法签名是什么？
- [ ] 2. 后端返回什么数据结构？
- [ ] 3. Orval 生成的类型定义是什么？
- [ ] 4. 前端 hooks 传递的参数是否匹配？
- [ ] 5. 前端组件访问数据的方式是否正确？

#### 实用命令

```bash
# 查看后端 Swagger 文档
curl -s http://localhost:7890/api-docs-json | jq '.paths["/permissions/roles"]'

# 查看生成的类型定义
cat frontend/src/models/permissionControllerFindAllRolesParams.ts

# 搜索相关 API 文件
grep -r "permissionControllerFindAll" frontend/src/services/api/
```

### 国际化（i18n）实现

**后端**：
- 使用 `nestjs-i18n` 返回国际化消息
- 翻译文件：`backend/src/i18n/{zh,en}/`
- 使用方式：`this.i18n.t('auth.INVALID_CREDENTIALS')`

**前端**：
- 使用 `react-i18next` 翻译 UI
- 翻译文件：`frontend/src/i18n/locales/{zh,en}/translation.json`
- 使用方式：`const { t } = useTranslation(); t('common.success')`

**前后端协同**：
- 前端通过 `Accept-Language` 请求头发送语言偏好
- 后端自动解析并返回对应语言

### 常见问题排查

1. **API 返回 undefined**：
   - 检查是否访问了 `.data`，拦截器已自动提取
   - 直接使用 API 调用结果即可

2. **类型错误**：
   - 确保运行了 `pnpm run generate:api`
   - 检查 `@/models/index.ts` 是否导出了新类型

3. **Hooks 顺序错误**：
   - 检查是否有早期返回（`if (isLoading) return`）
   - 将条件渲染移到所有 Hooks 之后

4. **菜单不显示**：
   - 检查路由是否正确注册
   - 检查 `routeTree.gen.ts` 是否包含新路由
   - 确保菜单配置中的 `url` 与路由路径匹配

5. **后端模块启动失败**：
   - 检查模块是否已在 `app.module.ts` 中导入
   - 检查依赖注入是否正确
   - 查看错误日志中的具体信息

6. **表格数据不显示**：
   - 检查 API 返回的数据结构（`data?.data` vs `data?.items`）
   - 后端分页响应字段可能是 `data` 而不是 `items`
   - 在浏览器开发者工具中查看实际响应结构

---

## CRUD 模块开发最佳实践

### 标准目录结构

每个功能模块都应遵循统一的目录结构，便于维护和扩展：

```
features/{module}/
├── components/                    # UI 组件层
│   ├── {module}s-table.tsx        # ✅ 核心表格组件
│   ├── {module}s-columns.tsx      # ✅ 列定义（Badge、格式化）
│   ├── {module}-form-dialog.tsx   # ✅ 新建/编辑对话框
│   ├── {module}s-primary-buttons.tsx  # ✅ 顶部操作按钮
│   ├── {module}s-dialogs.tsx      # ✅ 对话框容器
│   └── data-table-row-actions.tsx # ✅ 行内操作（编辑/删除）
├── hooks/                         # 数据管理层
│   └── use-{module}s.ts           # ✅ 5个 CRUD hooks
├── types/                         # 类型定义层
│   └── {module}.ts                # ✅ Zod schema + TypeScript 类型
└── index.tsx                      # ✅ 主页面（Header + Main + Table）

routes/_authenticated/{module}/
└── route.tsx                      # ✅ 路由定义（URL 参数验证）
```

**核心原则**：
- ✅ 先查看后端已实现的 API，再设计前端数据结构
- ✅ 使用 Orval 生成的类型，不要手动编写 API 调用
- ✅ 组件复用：相同功能的组件可以跨模块复用（如 DataTableRowActions）
- ✅ 类型安全：Zod schema 生成 TypeScript 类型，确保数据验证

### 数据访问规范

**后端 API 响应结构不统一问题**：

不同后端接口可能返回不同的分页数据结构：

```typescript
// 情况 A: 使用 data 字段（产品、合同等）
{
  "total": 7,
  "data": [...],     // ✅ 数据在 data 字段
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}

// 情况 B: 使用 items 字段（客户等）
{
  "items": [...],    // ✅ 数据在 items 字段
  "total": 100,
  "page": 1,
  "pageSize": 10
}

// 情况 C: 直接返回数组
[...]
```

**前端数据访问方式**：

```typescript
// ❌ 错误：假设所有 API 都返回 items
const products = data?.items || []

// ✅ 正确：根据实际 API 响应访问
const products = data?.data || []     // 产品、合同等
const customers = data?.items || []    // 客户
const roles = data || []               // 直接返回数组
```

**调试步骤**：
1. 打开浏览器开发者工具 → Network 标签
2. 找到对应的 API 请求
3. 查看 Response 中的实际数据结构
4. 根据实际字段名访问数据（`data?.data` 或 `data?.items`）

**类型定义示例**：

```typescript
// features/products/types/product.ts
export interface ProductListResponse {
  items: Product[]    // ⚠️ 如果后端返回 data 字段，这里应该改为 data: Product[]
  total: number
  page: number
  pageSize: number
}
```

### 选择器组件实现

**大数据量选择器设计**：

当数据量可能达到几千上万条时，需要特殊的交互设计：

#### 企业选择器（CustomerSelector）

**需求场景**：
- 企业名称唯一、工商编码唯一
- 可以通过这两个字段快速查找
- 如果搜索不到，提供高级查找入口

**实现方案**：

```typescript
// components/selectors/CustomerSelector.tsx
export function CustomerSelector({ value, onChange, onAdvancedSearch }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // 远程搜索 API
  const { data: searchResults } = useQuery({
    queryKey: ['customers', 'search', debouncedSearchTerm],
    queryFn: async () => {
      if (debouncedSearchTerm.length < 2) return []
      const { customerControllerFindAll } = getScrmApi()
      return await customerControllerFindAll({
        name: debouncedSearchTerm,
        pageSize: 10,
      })
    },
    enabled: debouncedSearchTerm.length >= 2,
  })

  // UI：Popover + Command + 搜索框 + 高级查找按钮
  return (
    <Popover>
      <PopoverTrigger>
        <Button>{selectedCustomer?.name || '选择客户...'}</Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandInput placeholder="输入企业名称或工商编码..." />
          <CommandList>
            {searchResults.map(customer => (
              <CommandItem
                key={customer.id}
                onSelect={() => onChange(customer.id)}
              >
                {customer.name} + {customer.code} + Badge
              </CommandItem>
            ))}
          </CommandList>
          <Button onClick={onAdvancedSearch}>高级查找</Button>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**关键特性**：
- ✅ 防抖 300ms，避免频繁 API 调用
- ✅ 最小输入长度 2 个字符
- ✅ 限制显示前 10 条结果
- ✅ 显示企业名称 + 工商编码 + 客户等级 Badge
- ✅ 高级查找按钮打开完整列表对话框

**依赖包**：
```bash
pnpm add @uidotdev/usehooks  # 提供 useDebounce
```

#### 产品选择器（ProductSelector）

产品数量通常较少（几十个），使用简化方案：

```typescript
// components/selectors/ProductSelector.tsx
export function ProductSelector({ value, onChange }: Props) {
  // 一次性加载所有产品
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { productControllerFindAll } = getScrmApi()
      return await productControllerFindAll({ pageSize: 100 })
    },
  })

  // UI：Popover + Command + 内置搜索
  return (
    <Popover>
      <PopoverTrigger>
        <Button>{selectedProduct?.name || '选择产品...'}</Button>
      </PopoverTrigger>
      <PopoverContent>
        <Command>
          <CommandInput placeholder="搜索产品名称..." />
          <CommandList>
            {products.map(product => (
              <CommandItem
                key={product.id}
                onSelect={() => onChange(product.id)}
              >
                {product.name} + {formatAmount(product.price)}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**选择器复用**：
- 统一放在 `components/selectors/` 目录
- 其他模块通过 import 复用
- 保持接口一致性：`{ value, onChange, disabled, ... }`

### ES 模块导入规范

**❌ 禁止使用 CommonJS require**：

```typescript
// ❌ 错误：在 ES 模块中使用 require()
const { DataTableRowActions } = require('./data-table-row-actions')
```

**✅ 必须使用 ES 模块 import**：

```typescript
// ✅ 正确：在文件顶部导入
import { DataTableRowActions } from './data-table-row-actions'

// 在组件中使用
const columns = useMemo(() => {
  return productsColumns.map((col) => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: (props: any) => (
          <DataTableRowActions
            row={props.row}
            onEdit={onEdit}
            onDelete={handleDelete}
          />
        ),
      }
    }
    return col
  })
}, [onEdit, handleDelete])
```

**原因**：
- Vite 使用 ES 模块系统，不支持 CommonJS 的 `require()`
- 动态导入会破坏 React 的渲染流程
- 静态 `import` 确保组件在模块加载时可用

**例外情况**：
- 代码分割（lazy loading）使用动态 `import()`：
  ```typescript
  const LazyComponent = lazy(() => import('./HeavyComponent'))
  ```

### 开发流程优化

**优先检索而非推测**：

❌ **错误流程**：
1. 直接根据经验推测 API 结构
2. 编写前端代码
3. 发现不匹配，返工修改

✅ **正确流程**：
1. 查看 `frontend/src/services/api/` 已生成的 API 文件
2. 查看 `frontend/src/models/` 类型定义
3. 确认后端实际返回的数据结构
4. 编写前端代码

**实用命令**：

```bash
# 1. 查看已生成的 API 文件
ls frontend/src/services/api/

# 2. 查看特定模块的 API 方法
cat frontend/src/services/api/products.ts

# 3. 查看类型定义
cat frontend/src/models/createProductDto.ts

# 4. 在浏览器中测试 API
curl http://localhost:7890/products

# 5. 重新生成 API 客户端
cd frontend && pnpm run generate:api
```

### 类型安全最佳实践

**使用 Zod Schema 确保数据验证**：

```typescript
// types/product.ts
import { z } from 'zod'

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  price: z.number(),
  // ... 其他字段
})

export type Product = z.infer<typeof productSchema>
```

**Zod 的优势**：
- ✅ 运行时数据验证
- ✅ 自动生成 TypeScript 类型
- ✅ 表单验证（react-hook-form + zodResolver）
- ✅ API 响应验证

**表单验证示例**：

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema } from '../types/product'

const form = useForm({
  resolver: zodResolver(productSchema),  // 自动验证
  defaultValues: { /* ... */ }
})

// 提交时自动验证，只有通过才会调用 onSubmit
<form onSubmit={form.handleSubmit(onSubmit)}>
  {/* ... */}
</form>
```

### 常见错误和解决方案

**错误 1: 表格数据为空**

**症状**：
```typescript
const { data } = useProducts()
const products = data?.items || []  // ❌ 数据为空
console.log(products)  // []
```

**原因**：后端返回 `data` 字段，但代码访问 `items` 字段

**解决方案**：
```typescript
// 1. 在 Network 标签查看实际响应
{
  "total": 7,
  "data": [...],     // ✅ 实际字段名是 data
  "page": 1
}

// 2. 修改代码访问正确的字段
const products = data?.data || []  // ✅ 正确
```

**错误 2: 选择器无法搜索**

**症状**：输入关键词后无反应

**原因**：
- 防抖时间未到
- 最小输入长度不足
- API 参数不匹配

**解决方案**：
```typescript
// 1. 确认防抖已生效
const debouncedSearchTerm = useDebounce(searchTerm, 300)  // ✅ 300ms

// 2. 确认最小输入长度
enabled: debouncedSearchTerm.length >= 2  // ✅ 至少 2 个字符

// 3. 确认 API 参数
await customerControllerFindAll({
  name: debouncedSearchTerm,  // ✅ 参数名正确
})
```

**错误 3: 模块导入错误**

**症状**：
```
TypeError: require is not defined
```

**原因**：在 ES 模块中使用 CommonJS 语法

**解决方案**：
```typescript
// ❌ 错误
const { Component } = require('./Component')

// ✅ 正确
import { Component } from './Component'
```

---

## 枚举类型迁移最佳实践

### 背景与问题

项目早期使用数字枚举（0, 1, 2...）表示状态，存在以下问题：
- 代码可读性差（`status === 1` vs `status === 'ACTIVE'`）
- 前后端类型不一致，容易出错
- 新增状态时需要同步多处代码

### 迁移策略

**从数字枚举迁移到字符串枚举的完整流程：**

#### 1. 数据库 Schema 修改

```prisma
// ❌ 旧方式：数字枚举
model User {
  status Int @default(1) // 1:启用 0:禁用
}

// ✅ 新方式：字符串枚举
model User {
  status String @default("ACTIVE") // ACTIVE:启用 INACTIVE:禁用
}
```

#### 2. 创建数据迁移文件

```bash
# 创建迁移目录
mkdir -p backend/prisma/migrations/TIMESTAMP_description

# 创建 migration.sql
ALTER TABLE "users" ADD COLUMN "status_temp" TEXT;
UPDATE "users" SET "status_temp" = CASE
  WHEN "status" = 1 THEN 'ACTIVE'
  WHEN "status" = 0 THEN 'INACTIVE'
  ELSE 'ACTIVE'
END;
ALTER TABLE "users" DROP COLUMN "status";
ALTER TABLE "users" RENAME COLUMN "status_temp" TO "status";
```

#### 3. 后端 DTO 修改

**关键经验：不要使用 `implements` 关键字**

```typescript
// ❌ 问题：Zod 的 .optional().default() 推断类型与 DTO 不匹配
import type { UserBase } from '@qzt/shared-types/dist/user/schemas'
export class CreateUserDto implements UserBase {
  status?: 'ACTIVE' | 'INACTIVE'  // TypeScript 报错：Property 'status' is optional...
}

// ✅ 正确：使用注释说明类型来源
// 类型定义参考 @qzt/shared-types/dist/user/schemas
export class CreateUserDto {
  @ApiPropertyOptional({
    description: '状态',
    enum: ['ACTIVE', 'INACTIVE'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE'
}
```

**原因**：Zod Schema 中 `z.enum().optional().default('ACTIVE')` 推断的类型仍然是必需的（不包含 `undefined`），但 DTO 中需要让字段可选。

#### 4. Service 层修改

```typescript
// ❌ 旧代码
if (user.status !== 1) { throw new Error('用户已禁用') }
await this.prisma.user.create({ data: { status: 1 } })
await this.prisma.user.findMany({ where: { status: 1 } })

// ✅ 新代码
if (user.status !== 'ACTIVE') { throw new Error('用户已禁用') }
await this.prisma.user.create({ data: { status: 'ACTIVE' } })
await this.prisma.user.findMany({ where: { status: 'ACTIVE' } })
```

#### 5. 接口类型更新

```typescript
// backend/src/modules/auth/interfaces/auth.interface.ts
export interface SafeUser {
  // ...
  status: string  // 从 number 改为 string
}
```

#### 6. 验证与生成

```bash
# 1. 生成 Prisma 客户端
cd backend && pnpm prisma generate

# 2. 推送 schema 到数据库
pnpm prisma db push

# 3. 重启后端服务
./start-dev.sh stop && ./start-dev.sh

# 4. 验证 Swagger 文档
curl -s http://localhost:7890/api-docs-json | jq '.components.schemas.CreateUserDto'

# 5. 重新生成前端 API
cd frontend && pnpm run generate:api
```

### 常见状态枚举映射

| 模块 | 旧值 | 新值 |
|------|------|------|
| User/Department/Role | 0/1 | INACTIVE/ACTIVE |
| Contract | 0/1/2 | UNPAID/PARTIAL/PAID |
| Payment | 0/1 | PENDING/CONFIRMED |
| Payment.method | '1'/'2'/'3'/'4' | BANK_TRANSFER/WECHAT/ALIPAY/CASH |
| Invoice | 0/1/2 | PENDING/ISSUED/CANCELLED |

### 避坑指南

1. **不要使用 `implements` 与 Zod 推断类型**
   - Zod 的 `.default()` 不会让字段在类型层面可选
   - 解决方案：使用 JSDoc 注释说明类型来源

2. **Service 层修改容易被遗漏**
   - 搜索 `status: 0`、`status: 1`、`status !== 1` 等模式
   - 特别注意定时任务、数据初始化脚本

3. **前端 API 需要重新生成**
   - Orval 从 Swagger 读取类型定义
   - 后端修改后必须重启才能更新 Swagger

4. **类型导入路径使用 `dist`**
   ```typescript
   // ✅ 正确
   import type { UserBase } from '@qzt/shared-types/dist/user/schemas'

   // ❌ 错误（子路径导出不可靠）
   import type { UserBase } from '@qzt/shared-types/user'
   ```

---

## 快速检查清单

### 开始新功能前

- [ ] 后端 API 是否已开发？
- [ ] 是否运行了 `pnpm run generate:api`？
- [ ] 是否查看了 `src/services/api/` 中的 API 文件？
- [ ] 是否查看了 `src/models/` 中的类型定义？
- [ ] 是否确认了 API 返回的数据结构（`data` vs `items`）？

### 实现过程中

- [ ] 是否使用了标准目录结构（types、hooks、components）？
- [ ] 是否使用了 Zod schema 进行类型定义？
- [ ] 是否使用了 `import` 而非 `require()`？
- [ ] 是否在浏览器中测试了 API 响应？
- [ ] 是否验证了数据访问路径（`data?.data` vs `data?.items`）？

### 完成后验证

- [ ] 前端页面能正常加载数据？
- [ ] CRUD 操作都能正常工作？
- [ ] 控制台无错误或警告？
- [ ] 类型检查通过（TypeScript）？
- [ ] API 调用成功（Network 标签）？

