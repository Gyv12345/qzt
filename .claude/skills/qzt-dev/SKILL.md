---
name: qzt-dev
description: 企账通（QZT）项目开发工作流。使用此技能进行任何 QZT 项目的开发任务，包括后端 API 开发、前端页面开发、组件开发或功能测试。该技能协调使用 React、NestJS、UI/UX 和测试等最佳实践技能。
---

## 项目架构概览

**QZT** 是一个基于现代化技术栈的 SCRM（社会化客户关系管理）系统，采用前后端分离架构。

### 核心技术栈

#### 前端技术栈
- **构建工具**: Vite 7.2.4
- **框架**: React 19.2.4
- **路由**: TanStack Router 1.141.2（文件路由系统）
- **状态管理**: TanStack Query 5.90.20 + Zustand 5.0.11
- **UI 组件**: Shadcn UI + Tailwind CSS 3.4.19
- **表单**: React Hook Form 7.68.0 + Zod 4.2.0
- **HTTP 客户端**: Orval 8.2.0（自动生成） + Axios 1.13.4
- **国际化**: i18next 24.2.3

#### 后端技术栈
- **框架**: NestJS 10.0.0
- **ORM**: Prisma 5.7.1
- **数据库**: PostgreSQL
- **API 文档**: Swagger/OpenAPI 3.0

#### 开发工具
- **包管理器**: pnpm（不使用 npm）
- **端口**: 前端 3456，后端 7890

### 参考资源

项目集成了 **Shadcn Admin** 的最佳实践。详细参考文档：

- 📄 **[Shadcn Admin 项目概览](./references/shadcn-admin-overview.md)** - 项目介绍、技术栈、核心特性
- 🏗️ **[Shadcn Admin 架构详解](./references/shadcn-admin-architecture.md)** - 组件架构、路由系统、状态管理
- 🔄 **[Shadcn Admin 迁移指南](./references/shadcn-admin-migration-guide.md)** - 如何集成 Shadcn Admin 组件到 QZT

## 开发工作流

根据任务类型，在开始开发前调用相应的专业技能：

### 后端开发
调用 `nestjs-best-practices` 技能以获得：
- NestJS 模块和依赖注入最佳实践
- 安全性和性能优化指导
- 企业级应用架构模式

### 前端开发
根据具体需求调用以下技能：

1. **`vercel-react-best-practices`** - React 性能优化
   - 组件优化模式
   - 数据获取策略
   - Bundle 优化

2. **`ui-ux-pro-max`** - UI/UX 设计
   - 样式系统（50+ 种风格）
   - 配色方案和字体搭配
   - 响应式布局和交互设计

3. **参考 Shadcn Admin 组件** - 查看参考文档了解如何使用布局、数据表格等组件

### 功能测试
开发完成后，调用 `webapp-testing` 技能进行：
- 功能验证测试
- UI 行为调试
- 浏览器截图和日志查看
- 回归测试

## 快速启动

```bash
# 启动开发环境（前端 + 后端）
pnpm dev

# 或使用启动脚本
./start-dev.sh
```

脚本会自动检查后端和前端是否已在运行，避免重复启动。

## 核心 API 开发规范

### ⚠️ 重要规则

**前端绝对不能直接修改或手写 API 调用代码！**

### 完整开发流程

#### 1. 后端开发 API

在 NestJS 中开发或修改 API 接口，确保：

```typescript
// backend/src/customers/customers.controller.ts
@Controller('customers')
export class CustomerController {
  @Get()
  findAll(@Query() query: any) {
    // 实现逻辑
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // 实现逻辑
  }

  @Post()
  create(@Body() createCustomerDto: CreateCustomerDto) {
    // 实现逻辑
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    // 实现逻辑
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    // 实现逻辑
  }
}
```

**重要**: 确保 Swagger 注解正确，以便 Orval 能生成正确的类型定义。

#### 2. 启动后端服务

```bash
cd backend
pnpm run start:dev
```

确认后端运行在 `http://localhost:7890`。

#### 3. 生成前端 API 客户端

```bash
cd frontend
pnpm run generate:api
```

Orval 会从 `http://localhost:7890/api-docs-json` 获取 OpenAPI spec，并生成：
- `src/services/api.ts` - API 函数
- `src/models/` - TypeScript 类型定义

#### 4. 检查生成的类型

```bash
# 查看生成的类型
cat frontend/src/models/customerControllerFindAllParams.ts

# 查看 API 函数
cat frontend/src/services/api.ts | grep -A 5 "customerControllerFindAll"
```

#### 5. 前端使用生成的 API

```typescript
// frontend/src/pages/customer/CustomerList.tsx
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'

export function CustomerList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', { page: 1, pageSize: 10 }],
    queryFn: () => getScrmApi().customerControllerFindAll({
      page: 1,
      pageSize: 10,
    }),
  })

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误: {error.message}</div>

  return (
    <div>
      {data?.data.map((customer) => (
        <div key={customer.id}>{customer.name}</div>
      ))}
    </div>
  )
}
```

### API 配置详解

#### Mutator 配置（Axios 实例）

```typescript
// frontend/src/services/mutator.ts
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'http://localhost:7890',  // ✅ 直接指向后端，无 /api 前缀
  timeout: 10000,
})

// 请求拦截器：添加 token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：处理错误
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const customInstance = async ({ url, method, data, params }) => {
  const response = await axiosInstance.request({
    url,
    method,
    data,
    params,
  })
  return response.data
}
```

#### Vite 代理配置（开发环境）

```typescript
// frontend/vite.config.ts
export default defineConfig({
  server: {
    port: 3456,
    proxy: {
      '/api': {
        target: 'http://localhost:7890',
        changeOrigin: true,
        // ⚠️ 不需要 pathRewrite！因为后端路由不带 /api
      },
    },
  },
})
```

**注意**: 这个代理配置仅用于开发环境，实际生产部署需要配置 Nginx 反向代理。

#### 实际请求流程

1. **前端代码调用**:
   ```typescript
   getScrmApi().customerControllerFindAll({ page: 1 })
   ```

2. **Orval 生成的 API**:
   ```typescript
   // src/services/api.ts
   const customerControllerFindAll = (params) => {
     return customInstance({
       url: `/customers`,  // ✅ 无前缀
       method: 'GET',
       params,
     })
   }
   ```

3. **Mutator Axios 实例**:
   ```typescript
   baseURL: 'http://localhost:7890'
   url: `/customers`
   // 最终请求: http://localhost:7890/customers
   ```

4. **后端接收**:
   ```typescript
   @Controller('customers')  // ✅ 路径匹配
   @Get()
   findAll() { }
   ```

### ❌ 常见错误

#### 错误 1: 手动添加 /api 前缀

```typescript
// ❌ 错误
getScrmApi().customerControllerFindAll({ page: 1 })
// 修改为:
request('/api/customers')  // 会变成 /api/api/customers 或错误
```

#### 错误 2: 修改 Orval 生成的文件

```typescript
// ❌ 不要手动修改 src/services/api.ts
// ✅ 如果需要自定义，创建适配器层
```

```typescript
// ✅ 正确做法：创建适配器
// frontend/src/lib/api-adapter.ts
import { getScrmApi } from '@/services/api'

export const qztApi = {
  getCustomers: (params) =>
    getScrmApi().customerControllerFindAll(params),
  // 可以添加额外的逻辑，如缓存、重试等
}
```

#### 错误 3: 使用错误的 baseURL

```typescript
// ❌ 错误
const axiosInstance = axios.create({
  baseURL: 'http://localhost:7890/api',  // 不要加 /api
})

// ✅ 正确
const axiosInstance = axios.create({
  baseURL: 'http://localhost:7890',
})
```

### 调试技巧

#### 检查 API 是否正常

```bash
# 1. 检查后端 Swagger 文档
curl http://localhost:7890/api-docs-json

# 2. 检查后端 API
curl http://localhost:7890/customers

# 3. 检查前端 Orval 生成
ls frontend/src/services/api.ts
ls frontend/src/models/

# 4. 浏览器开发者工具
# Network 面板查看实际请求 URL
# 应该是: http://localhost:7890/customers
# 不应该是: http://localhost:7890/api/customers
```

#### 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 404 错误 | API 路径错误 | 检查是否有 `/api` 前缀 |
| CORS 错误 | 后端未配置 CORS | 在 backend/main.ts 添加 CORS 配置 |
| 类型错误 | 未重新生成 API | 运行 `pnpm run generate:api` |
| 401 错误 | Token 未添加 | 检查 mutator 拦截器 |

## Prisma 最佳实践

### 关联查询的三种方式

#### 1. 自动关联（直接访问外键）

适用于只需要外键 ID 的情况：

```typescript
const customers = await prisma.customer.findMany({
  select: {
    id: true,
    name: true,
    followUserId: true,  // 直接访问外键
  }
})
```

#### 2. include + select（推荐）

适用于需要关联对象的特定字段：

```typescript
const contract = await prisma.contract.findUnique({
  where: { id },
  include: {
    customer: {
      select: { id: true, name: true, contactPhone: true }
    },
    product: {
      select: { id: true, name: true, price: true }
    }
  }
})
```

#### 3. 手动链接查询

仅在以下场景使用：
- 性能敏感场景（大数据量）
- 需要复杂过滤的关联数据
- 多处复用同一批关联数据

```typescript
const [contracts, customers] = await Promise.all([
  prisma.contract.findMany({
    where: { status: 0 },
    select: { id: true, contractNo: true, customerId: true }
  }),
  prisma.customer.findMany({
    where: {
      id: { in: contracts.map(c => c.customerId) },
      status: 1  // 独立过滤条件
    }
  })
])
```

### 核心原则

✅ **优先使用 include + select**：
- 代码简洁，类型安全
- Prisma 自动优化查询（使用 JOIN）
- 避免返回过多字段

✅ **始终使用 select 限制字段**：
```typescript
// ❌ 返回所有字段
include: { customer: true }

// ✅ 只返回需要的字段
include: {
  customer: {
    select: { id: true, name: true }
  }
}
```

❌ **避免反模式**：
```typescript
// ❌ N+1 查询
for (const contract of contracts) {
  const customer = await prisma.customer.findUnique({
    where: { id: contract.customerId }
  })
}

// ❌ 简单场景过度优化（使用手动链接）
// 简单关联让 Prisma 处理即可
```

### 命名约定

Prisma 生成的关联字段命名：
- **一对多**: 使用复数形式，如 `roles`, `customers`
- **多对一**: 使用单数形式，如 `customer`, `product`
- **自引用**: 区分父级和子级，如 `parent`, `children`

在 `schema.prisma` 中定义关系时，确保字段命名符合这些约定。

## 前端开发最佳实践

### TanStack Router 文件路由

```
frontend/src/routes/
├── routeTree.gen.ts       # 自动生成，不要手动编辑
├── __root.tsx             # 根路由
├── (auth)/                # 认证路由组
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── _authenticated/        # 受保护路由组
    ├── dashboard.tsx
    ├── customers/
    │   └── customers.tsx
    └── products/
        └── products.tsx
```

### 路由保护

```typescript
// _authenticated/__root.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw redirect({
        to: '/login',
      })
    }
  },
})
```

### TanStack Query 数据获取

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'

// 查询
const { data, isLoading, error } = useQuery({
  queryKey: ['customers', page],
  queryFn: () => getScrmApi().customerControllerFindAll({ page }),
  staleTime: 1000 * 60 * 5, // 5 分钟
})

// 变更
const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: (data) =>
    getScrmApi().customerControllerCreate(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  },
})
```

### 表单处理

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// 1. 定义 Zod schema
const formSchema = z.object({
  name: z.string().min(1, '请输入客户名称'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
})

// 2. 使用 useForm
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: '',
    phone: '',
  },
})

// 3. 提交处理
const onSubmit = (data: z.infer<typeof formSchema>) => {
  mutation.mutate(data)
}
```

## 组件开发指南

### 使用 Shadcn Admin 组件

参考 **[Shadcn Admin 迁移指南](./references/shadcn-admin-migration-guide.md)** 了解如何集成组件。

### 可用的 Shadcn UI 组件

项目已集成以下 Shadcn UI 组件：

```typescript
// 基础组件
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 复杂组件
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Table } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
```

### 添加新的 Shadcn UI 组件

```bash
cd frontend
npx shadcn@latest add [component-name]
```

例如：
```bash
npx shadcn@latest add toast
npx shadcn@latest add tooltip
```

### 创建自定义组件

参考 Shadcn Admin 的组件模式：

```typescript
// frontend/src/components/custom/customer-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useCreateCustomer } from '@/services/customer'

const formSchema = z.object({
  name: z.string().min(1, '请输入客户名称'),
  phone: z.string().min(11, '请输入有效的手机号'),
})

export function CustomerForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const { toast } = useToast()
  const mutation = useCreateCustomer()

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data, {
      onSuccess: () => {
        toast({ title: '客户创建成功' })
      },
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <Label>客户名称</Label>
        <Input {...form.register('name')} />
      </div>
      {/* ... 更多字段 */}
      <Button type="submit">提交</Button>
    </form>
  )
}
```

## 国际化 (i18n)

### 配置

项目使用 i18next 进行国际化：

```typescript
// frontend/src/lib/i18n.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import en from './locales/en.json'

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: 'zh',
  fallbackLng: 'zh',
})
```

### 使用

```typescript
import { useTranslation } from 'react-i18next'

function Component() {
  const { t } = useTranslation()

  return <div>{t('customer.name')}</div>
}
```

### 添加翻译

```json
// frontend/src/locales/zh.json
{
  "customer": {
    "name": "客户名称",
    "phone": "联系电话"
  }
}

// frontend/src/locales/en.json
{
  "customer": {
    "name": "Customer Name",
    "phone": "Contact Phone"
  }
}
```

## 状态管理

### Zustand Store

对于简单的全局状态，使用 Zustand：

```typescript
// frontend/src/stores/authStore.ts
import { create } from 'zustand'

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  clearAuth: () => set({ user: null, token: null }),
}))
```

```typescript
// 使用
import { useAuthStore } from '@/stores/authStore'

function Component() {
  const { user, clearAuth } = useAuthStore()
  return <div>{user?.name}</div>
}
```

### TanStack Query

对于服务器状态，使用 TanStack Query：

```typescript
// ✅ 服务器状态
const { data } = useQuery({
  queryKey: ['customers'],
  queryFn: () => getScrmApi().customerControllerFindAll(),
})

// ❌ 不要用 Zustand 存储服务器状态
const customers = useCustomerStore(state => state.customers)
```

## 错误处理

### 统一错误处理

```typescript
// frontend/src/lib/error-handler.ts
import { toast } from 'sonner'

export function handleApiError(error: any) {
  if (error.response?.status === 401) {
    toast.error('登录已过期，请重新登录')
    window.location.href = '/login'
  } else if (error.response?.status === 403) {
    toast.error('没有权限执行此操作')
  } else if (error.response?.status === 500) {
    toast.error('服务器错误，请稍后重试')
  } else {
    toast.error(error.message || '操作失败')
  }
}
```

### 使用

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onError: handleApiError,
  onSuccess: () => {
    toast.success('操作成功')
  },
})
```

## 性能优化

### 代码分割

TanStack Router 自动进行代码分割。手动分割：

```typescript
import { lazy } from 'react'

const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyComponent />
    </Suspense>
  )
}
```

### React 优化

```typescript
import { memo, useMemo, useCallback } from 'react'

// 1. 使用 memo 避免不必要的重渲染
export const CustomerItem = memo(({ customer }) => {
  return <div>{customer.name}</div>
})

// 2. 使用 useMemo 缓存计算结果
const filteredCustomers = useMemo(() =>
  customers.filter(c => c.status === 'active'),
  [customers]
)

// 3. 使用 useCallback 稳定函数引用
const handleDelete = useCallback((id) => {
  deleteCustomer(id)
}, [])
```

### TanStack Query 优化

```typescript
// 1. 设置合理的 staleTime
useQuery({
  queryKey: ['customers'],
  queryFn: fetchCustomers,
  staleTime: 1000 * 60 * 5, // 5 分钟内不会重新获取
})

// 2. 使用 prefetch 预加载数据
queryClient.prefetchQuery({
  queryKey: ['customers'],
  queryFn: fetchCustomers,
})
```

## 开发检查清单

开发新功能前，确认以下事项：

### 后端开发
- [ ] 已在 NestJS 中实现 API 接口
- [ ] 已添加 Swagger 注解
- [ ] 已测试 API（使用 Swagger 或 curl）
- [ ] 后端服务运行在 7890 端口

### 前端开发
- [ ] 已运行 `pnpm run generate:api`
- [ ] 已查看 `src/models/` 中的类型定义
- [ ] 使用 `getScrmApi()` 生成的函数
- [ ] IDE 无 TypeScript 错误
- [ ] 不直接修改 `src/services/api.ts`

### 组件开发
- [ ] 遵循 Shadcn UI 组件模式
- [ ] 使用 TypeScript 严格类型
- [ ] 添加适当的错误处理
- [ ] 响应式设计（移动端适配）
- [ ] 无障碍性（键盘导航、ARIA 属性）

### 测试
- [ ] 功能测试正常
- [ ] API 调用成功
- [ ] 错误处理正确
- [ ] 控制台无错误
- [ ] 移动端测试正常

## 常用命令

### 后端

```bash
cd backend

# 开发
pnpm run start:dev

# 构建
pnpm run build

# Prisma 生成
pnpm run prisma:generate

# Prisma 迁移
pnpm run prisma:migrate

# 生成 Swagger
pnpm run swagger
```

### 前端

```bash
cd frontend

# 开发
pnpm run dev

# 构建
pnpm run build

# 生成 API 客户端
pnpm run generate:api

# 代码检查
pnpm run lint

# 代码格式化
pnpm run format
```

## 故障排除

### 问题: Orval 生成失败

**症状**: 运行 `pnpm run generate:api` 报错

**解决方案**:
```bash
# 1. 确认后端服务运行
curl http://localhost:7890/api-docs-json

# 2. 检查 orval.config.ts 配置
# frontend/orval.config.ts
input: {
  target: 'http://localhost:7890/api-docs-json',
}

# 3. 清除缓存重试
rm -rf frontend/node_modules/.vite
cd frontend && pnpm run generate:api
```

### 问题: TanStack Router 类型错误

**症状**: `Route.useParams()` 返回 `unknown` 类型

**解决方案**:
```bash
# 重新生成路由树
cd frontend
rm src/routeTree.gen.ts
pnpm run dev
# 路由树会自动重新生成
```

### 问题: Tailwind CSS 样式不生效

**症状**: 添加的 Tailwind 类名不工作

**解决方案**:
```bash
# 1. 检查类名是否正确
# 2. 确认内容在 src 目录下
# 3. 检查 tailwind.config.js 中的 content 配置
# 4. 重启开发服务器
```

## 参考资源

- **[Orval 文档](https://orval.dev/)** - API 客户端生成
- **[TanStack Router 文档](https://tanstack.com/router/latest)** - 文件路由系统
- **[TanStack Query 文档](https://tanstack.com/query/latest)** - 数据获取和状态管理
- **[Shadcn UI 文档](https://ui.shadcn.com)** - UI 组件库
- **[NestJS 文档](https://docs.nestjs.com)** - 后端框架
- **[Prisma 文档](https://www.prisma.io/docs)** - ORM
- **[i18next 文档](https://www.i18next.com)** - 国际化

## 总结

QZT 项目采用现代化的技术栈，强调类型安全、代码自动生成和最佳实践。遵循本指南可以确保代码质量、开发效率和团队协作的一致性。

记住核心原则：
1. ✅ **使用 Orval 生成的 API**，不要手写
2. ✅ **使用 TanStack Query** 管理服务器状态
3. ✅ **使用 Shadcn UI** 组件，保持一致性
4. ✅ **遵循 Prisma 最佳实践**，优化查询
5. ✅ **参考 Shadcn Admin**，学习优秀的组件模式

持续学习和改进，祝开发愉快！🚀
