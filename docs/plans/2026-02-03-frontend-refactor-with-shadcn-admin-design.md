# 前端架构重构设计方案

**项目**: 企账通 (QZT) SCRM 系统
**日期**: 2026-02-03
**作者**: AI Assistant + 用户讨论
**状态**: ✅ 设计已确认

---

## 📋 设计目标

基于用户需求，对 QZT 前端进行**完全重构**，采用 [shadcn-admin](https://github.com/satnaing/shadcn-admin) 的架构模式，实现以下核心目标：

### 核心目标
- ✅ **完全类型安全** - 路径参数、搜索参数、loader 数据全部类型推断
- ✅ **优化的数据加载** - TanStack Router + Query 深度集成
- ✅ **URL 状态同步** - 表格筛选、排序、分页自动同步到 URL
- ✅ **开发体验提升** - 文件路由、自动类型推断、更好的 DX

### 重构策略
- **策略选择**: A - 完全重构（大爆炸）
- **迁移方式**: 一次性迁移所有 9 个页面模块到 TanStack Router
- **实施方式**: 13-19 天完整迁移计划

---

## 🏗️ 技术栈升级

### 核心变更

| 组件 | 当前技术 | 升级后 | 变更类型 |
|------|----------|--------|----------|
| **路由** | React Router v7 | TanStack Router v1.14 | 🔴 完全替换 |
| **数据表格** | 无 | TanStack Table v8 | 🟢 新增 |
| **表单验证** | 无 | React Hook Form + Zod | 🟢 新增 |
| **主题切换** | 无 | 明暗模式支持 | 🟢 新增 |
| **全局搜索** | 无 | Command + K | 🟢 新增 |
| **URL 状态** | 手动管理 | 自动同步 | 🟢 增强 |

### 保持不变
- ✅ React 19.2.4
- ✅ TypeScript ~5.9.3
- ✅ Tailwind CSS 4.x
- ✅ Shadcn UI (@radix-ui/*)
- ✅ Zustand (状态管理)
- ✅ TanStack Query v5
- ✅ Lucide React (图标)

### 新增依赖

```json
{
  "@tanstack/react-router": "^1.141.2",
  "@tanstack/react-table": "^8.21.3",
  "react-hook-form": "^7.68.0",
  "@hookform/resolvers": "^5.2.2",
  "zod": "^4.2.0",
  "cmdk": "1.1.1",
  "react-top-loading-bar": "^3.0.2"
}
```

---

## 📁 项目结构重组

### 当前结构（React Router）

```
src/
├── router/
│   └── index.tsx              # 手动配置路由
├── pages/                     # 页面组件
│   ├── customer/
│   ├── contact/
│   ├── contract/
│   ├── invoice/
│   ├── product/
│   ├── follow-record/
│   ├── statistics/
│   ├── system/
│   ├── DashboardPage.tsx
│   └── LoginPage.tsx
├── components/
│   ├── ui/                    # shadcn/ui 组件
│   ├── common/                # 通用组件
│   └── Sidebar.tsx
├── layouts/
│   └── MainLayout.tsx
├── services/                  # API 客户端
├── stores/                    # Zustand stores
└── models/                    # TypeScript 类型
```

### 新结构（TanStack Router）

```
src/
├── routes/                    # 🆕 文件路由系统
│   ├── __root.tsx             # 根布局
│   ├── routeTree.gen.ts       # 自动生成
│   ├── (auth)/                # 认证路由组
│   │   └── login.tsx          # /login
│   └── _authenticated/        # 已认证路由组
│       ├── __root.tsx         # 认证布局
│       ├── index.tsx          # / → /dashboard
│       ├── dashboard.tsx      # /dashboard
│       ├── customers.tsx      # /customers
│       ├── customers.$id.tsx  # /customers/:id
│       ├── contacts.tsx       # /contacts
│       ├── contacts.$id.tsx   # /contacts/:id
│       ├── contracts.tsx      # /contracts
│       ├── contracts.$id.tsx  # /contracts/:id
│       ├── invoices.tsx       # /invoices
│       ├── products.tsx       # /products
│       ├── products.$id.tsx   # /products/:id
│       ├── follow-records.tsx # /follow-records
│       ├── statistics.tsx     # /statistics
│       └── system.tsx         # /system
├── features/                  # 🔄 从 pages 迁移
│   ├── customer/
│   ├── contact/
│   ├── contract/
│   ├── invoice/
│   ├── product/
│   ├── follow-record/
│   ├── statistics/
│   ├── dashboard/
│   ├── auth/
│   └── system/
├── components/
│   ├── ui/                    # shadcn/ui 组件（保持）
│   ├── layout/                # 🆕 布局组件
│   │   ├── authenticated-layout.tsx
│   │   ├── app-sidebar.tsx
│   │   ├── header.tsx
│   │   ├── main.tsx
│   │   └── data/
│   │       └── sidebar-data.ts
│   ├── data-table/            # 🆕 数据表格组件
│   │   ├── data-table.tsx
│   │   ├── data-table-toolbar.tsx
│   │   ├── data-table-pagination.tsx
│   │   └── data-table-faceted-filter.tsx
│   ├── theme-switch.tsx       # 🆕 主题切换
│   ├── search.tsx             # 🆕 全局搜索
│   └── errors/                # 🆕 错误页面
│       ├── not-found-error.tsx
│       ├── unauthorized-error.tsx
│       └── general-error.tsx
├── hooks/                     # 🔄 新增 hooks
│   ├── use-table-url-state.ts # URL 状态管理
│   └── use-mobile.ts
├── lib/
│   ├── api-client.ts          # 🔄 优化 API 客户端
│   └── utils.ts
├── stores/                    # 保持
├── services/                  # 保持
└── models/                    # 保持
```

### 文件路由映射表

| 当前路径 (React Router) | 新路径 (TanStack Router) | 文件 |
|------------------------|--------------------------|------|
| `/login` | `/login` | `routes/(auth)/login.tsx` |
| `/dashboard` | `/dashboard` | `routes/_authenticated/dashboard.tsx` |
| `/customers` | `/customers` | `routes/_authenticated/customers.tsx` |
| `/customers/:id` | `/customers/:id` | `routes/_authenticated/customers.$id.tsx` |
| `/contacts` | `/contacts` | `routes/_authenticated/contacts.tsx` |
| `/contacts/:id` | `/contacts/:id` | `routes/_authenticated/contacts.$id.tsx` |
| `/contracts` | `/contracts` | `routes/_authenticated/contracts.tsx` |
| `/contracts/:id` | `/contracts/:id` | `routes/_authenticated/contracts.$id.tsx` |
| `/invoices` | `/invoices` | `routes/_authenticated/invoices.tsx` |
| `/products` | `/products` | `routes/_authenticated/products.tsx` |
| `/products/:id` | `/products/:id` | `routes/_authenticated/products.$id.tsx` |
| `/follow-records` | `/follow-records` | `routes/_authenticated/follow-records.tsx` |
| `/statistics` | `/statistics` | `routes/_authenticated/statistics.tsx` |
| `/system` | `/system` | `routes/_authenticated/system.tsx` |

---

## 🔐 类型安全的路由系统

### 1. 根路由（Router Context）

```typescript
// routes/__root.tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

interface RouterContext {
  isAuthenticated: boolean
  user: User | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})
```

### 2. 认证布局（Protected Routes）

```typescript
// routes/_authenticated/__root.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    // ✅ 类型安全的认证检查
    if (!context.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### 3. 客户列表（类型安全的搜索参数）

```typescript
// routes/_authenticated/customers.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

// ✅ Zod schema 验证搜索参数
const customerSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
  keyword: z.string().optional(),
  customerLevel: z.array(z.string()).optional(),
  sortField: z.enum(['name', 'createdAt', 'customerLevel']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

type CustomerSearch = z.infer<typeof customerSearchSchema>

export const Route = createFileRoute('/_authenticated/customers')({
  validateSearch: (search) => customerSearchSchema.parse(search),
  loader: async ({ search, context }) => {
    const customers = await getScrmApi().customerControllerFindAll({
      page: search.page - 1,
      pageSize: search.pageSize,
      keyword: search.keyword,
      customerLevel: search.customerLevel,
    })
    return customers
  },
  component: CustomerListPage,
})

function CustomerListPage() {
  // ✅ 完全类型化的数据
  const { data, total } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // ✅ 类型安全：search.page 是 number
  console.log(search.page)

  return (
    <div>
      <h1>客户列表</h1>
      <CustomerTable data={data} total={total} />
    </div>
  )
}
```

### 4. 客户详情（类型安全的路径参数）

```typescript
// routes/_authenticated/customers.$id.tsx
import { createFileRoute, notFound } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/customers/$id')({
  // ✅ params.id 自动推断为 string
  loader: async ({ params: { id } }) => {
    const customer = await getScrmApi().customerControllerFindOne({ id })
    if (!customer) {
      throw notFound()
    }
    return customer
  },
  component: CustomerDetailPage,
})

function CustomerDetailPage() {
  // ✅ params 完全类型化
  const { id } = Route.useParams()
  const customer = Route.useLoaderData()

  return (
    <div>
      <h1>{customer.name}</h1>
      <p>ID: {id}</p>
    </div>
  )
}
```

---

## 💾 数据加载与状态管理

### TanStack Router + Query 集成

#### 方案 A：Router Loader（推荐用于初始加载）

```typescript
export const Route = createFileRoute('/_authenticated/customers')({
  loader: async ({ search }) => {
    // ✅ 自动缓存，相同请求不会重复调用
    const data = await getScrmApi().customerControllerFindAll({
      page: search.page - 1,
      pageSize: search.pageSize,
      keyword: search.keyword,
    })
    return data
  },
  component: CustomerListPage,
})
```

#### 方案 B：组件内 Query（推荐用于用户交互）

```typescript
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'

const customerRoute = getRouteApi('/_authenticated/customers')

export function CustomerListPage() {
  const search = customerRoute.useSearch()

  // ✅ 查询键自动包含搜索参数
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getScrmApi().customerControllerFindAll({
      page: search.page - 1,
      pageSize: search.pageSize,
      keyword: search.keyword,
    }),
    staleTime: 1000 * 60 * 5, // 5 分钟
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return <CustomerTable data={data} />
}
```

### URL 状态同步

```typescript
// hooks/use-table-url-state.ts
import { useNavigate } from '@tanstack/react-router'

export function useTableUrlState() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  // ✅ 从 URL 读取状态
  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 10

  // ✅ 更新 URL
  const updateState = (updates: Partial<typeof search>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    })
  }

  return {
    page,
    pageSize,
    setPage: (page: number) => updateState({ page }),
    setPageSize: (pageSize: number) => updateState({ pageSize }),
  }
}
```

### 表单处理与验证

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

const contactSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  position: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

export function ContactForm({ initialData, onSuccess }) {
  const router = useRouter()
  const navigate = router.useNavigate()

  const { control, handleSubmit, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: initialData,
  })

  const mutation = useMutation({
    mutationFn: (data: ContactFormData) => createContact(data),
    onSuccess: () => {
      // ✅ 自动刷新列表数据
      router.invalidate()
      // ✅ 返回列表页
      navigate({ to: '/contacts' })
      onSuccess?.()
    },
  })

  return (
    <form onSubmit={handleSubmit(mutation.mutate)}>
      <FormField control={control} name="name" />
      <FormField control={control} name="phone" />
      <Button type="submit" disabled={mutation.isPending}>
        保存
      </Button>
    </form>
  )
}
```

---

## 🎨 布局与组件系统

### 布局层次结构

```
__root.tsx (根布局)
└── _authenticated/ (认证布局)
    ├── AppSidebar (侧边栏)
    ├── Header (顶部栏)
    └── Main (内容区)
        └── Outlet (页面内容)
```

### AppSidebar 组件

```typescript
// components/layout/app-sidebar.tsx
import { Link, useRouter, Outlet } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, Book, MessageSquare,
  BarChart3, FileText, Receipt, Package, Settings
} from 'lucide-react'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '首页' },
  { path: '/customers', icon: Building2, label: '公司' },
  { path: '/contacts', icon: Book, label: '联系人' },
  { path: '/follow-records', icon: MessageSquare, label: '跟进' },
  { path: '/statistics', icon: BarChart3, label: '统计' },
  { path: '/contracts', icon: FileText, label: '合同' },
  { path: '/invoices', icon: Receipt, label: '开票' },
  { path: '/products', icon: Package, label: '产品' },
  { path: '/system', icon: Settings, label: '系统' },
]

export function AppSidebar() {
  const router = useRouter()
  const currentPath = router.state.location.pathname
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      "flex flex-col bg-gray-900 text-white transition-all duration-200",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <Building2 className="h-8 w-8 text-blue-400" />
        {!collapsed && (
          <span className="ml-2 text-xl font-bold">企账通</span>
        )}
      </div>

      {/* 菜单 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="ml-3">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 折叠按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-gray-800 p-3 text-gray-400 hover:text-white"
      >
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  )
}
```

### 高级数据表格

```typescript
// components/data-table/data-table.tsx
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  pageSize?: number
}

export function DataTable<TData>({
  data,
  columns,
  pageSize = 10,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, pagination },
  })

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
```

### 主题切换

```typescript
// components/theme-switch.tsx
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeSwitch() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = stored || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0">
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  )
}
```

---

## ⚠️ 错误处理

### 全局错误边界

```typescript
// routes/__root.tsx
import { ErrorComponent } from '@tanstack/react-router'

export const Route = createRootRouteWithContext<RouterContext>()({
  errorComponent: ({ error }) => {
    console.error('路由错误:', error)

    if (error.status === 401) return <UnauthorizedError />
    if (error.status === 403) return <ForbiddenError />
    if (error.status === 404) return <NotFoundError />

    return <GeneralError error={error} />
  },
})
```

### 错误页面组件

```typescript
// components/errors/not-found-error.tsx
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export function NotFoundError() {
  const router = useRouter()

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-gray-400" />
        <h1 className="mt-4 text-2xl font-bold">404 - 页面不存在</h1>
        <p className="mt-2 text-muted-foreground">
          您访问的页面可能已被删除或暂时不可用
        </p>
        <Button
          className="mt-6"
          onClick={() => router.navigate({ to: '/dashboard' })}
        >
          返回首页
        </Button>
      </div>
    </div>
  )
}
```

### API 错误处理

```typescript
// lib/api-client.ts
import { toast } from 'sonner'

const apiClient = new HttpClient({
  baseURL: '/api',
  onResponseError: (error) => {
    if (error.status === 401) {
      window.location.href = '/login'
    }
    if (error.status === 403) {
      toast.error('您没有权限执行此操作')
    }
    if (error.status >= 500) {
      toast.error('服务器错误，请稍后重试')
    }
  },
})
```

---

## 📊 测试策略

### 单元测试（Vitest）

```typescript
// features/customer/__tests__/customer-list.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CustomerListPage } from '../customer-list-page'

describe('CustomerListPage', () => {
  it('应该显示客户列表', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <CustomerListPage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('客户列表')).toBeInTheDocument()
    })
  })
})
```

### E2E 测试（Playwright）

```typescript
// e2e/customer.spec.ts
import { test, expect } from '@playwright/test'

test.describe('客户管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3456')
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
  })

  test('应该显示客户列表', async ({ page }) => {
    await page.goto('http://localhost:3456/customers')
    await expect(page.locator('h1')).toContainText('客户管理')
  })

  test('应该能够创建客户', async ({ page }) => {
    await page.goto('http://localhost:3456/customers')
    await page.click('button:has-text("新增客户")')
    await page.fill('input[name="name"]', '测试客户')
    await page.fill('input[name="contact"]', '张三')
    await page.fill('input[name="phone"]', '13800138000')
    await page.click('button:has-text("保存")')

    await expect(page.locator('text=创建成功')).toBeVisible()
  })
})
```

---

## 📅 实施计划

### 阶段一：环境准备（1-2天）

**任务清单**：
- [ ] 安装依赖
  ```bash
  pnpm add @tanstack/react-router @tanstack/react-table
  pnpm add react-hook-form @hookform/resolvers zod
  pnpm add cmdk react-top-loading-bar
  ```
- [ ] 配置 Vite 插件（`vite.config.ts`）
- [ ] 创建基础目录结构
- [ ] 配置 Tailwind CSS 主题变量

### 阶段二：核心布局迁移（2-3天）

**任务清单**：
- [ ] 创建 `routes/__root.tsx` 和路由上下文
- [ ] 创建 `routes/_authenticated/__root.tsx` 认证布局
- [ ] 实现 `AppSidebar` 组件
- [ ] 实现 `Header` 组件
- [ ] 实现 `Main` 组件
- [ ] 迁移 `MainLayout` 到新布局系统
- [ ] 添加全局加载条
- [ ] 测试基础导航功能

### 阶段三：页面迁移（5-7天）

**Day 1-2: Dashboard 和 Login**
- [ ] `routes/(auth)/login.tsx`
- [ ] `routes/_authenticated/dashboard.tsx`
- [ ] 测试登录流程
- [ ] 测试仪表板显示

**Day 3: Customer 模块**
- [ ] `routes/_authenticated/customers.tsx`
- [ ] `routes/_authenticated/customers.$id.tsx`
- [ ] 迁移 `features/customer/*`
- [ ] 实现客户列表数据表格
- [ ] 实现客户详情页
- [ ] 测试客户 CRUD 功能

**Day 4: Contact 模块**
- [ ] `routes/_authenticated/contacts.tsx`
- [ ] `routes/_authenticated/contacts.$id.tsx`
- [ ] 迁移 `features/contact/*`
- [ ] 实现联系人列表数据表格
- [ ] 实现联系人详情页
- [ ] 测试联系人 CRUD 功能

**Day 5: Contract 和 Invoice**
- [ ] `routes/_authenticated/contracts.tsx`
- [ ] `routes/_authenticated/contracts.$id.tsx`
- [ ] `routes/_authenticated/invoices.tsx`
- [ ] 迁移相关 features
- [ ] 实现合同和发票列表
- [ ] 测试功能

**Day 6: Product 和 Statistics**
- [ ] `routes/_authenticated/products.tsx`
- [ ] `routes/_authenticated/products.$id.tsx`
- [ ] `routes/_authenticated/statistics.tsx`
- [ ] 迁移相关 features
- [ ] 实现图表和统计功能
- [ ] 测试功能

**Day 7: System 和其他页面**
- [ ] `routes/_authenticated/system.tsx`
- [ ] `routes/_authenticated/follow-records.tsx`
- [ ] 迁移系统管理页面
- [ ] 迁移跟进记录页面
- [ ] 全面回归测试

### 阶段四：功能增强（3-4天）

**任务清单**：
- [ ] 实现高级数据表格组件
  - [ ] 多列排序
  - [ ] 列筛选
  - [ ] 列显示/隐藏
  - [ ] 批量操作
  - [ ] 行选择
- [ ] 添加主题切换功能
  - [ ] 实现明暗模式切换
  - [ ] 保存用户偏好到 localStorage
  - [ ] 添加主题切换动画
- [ ] 添加全局搜索（Command + K）
  - [ ] 实现 Command 组件
  - [ ] 搜索页面、菜单项
  - [ ] 快捷键支持
- [ ] URL 状态同步完善
  - [ ] 表格状态同步到 URL
  - [ ] 筛选条件同步
  - [ ] 分页状态同步
- [ ] 表单验证完善
  - [ ] 所有表单添加 Zod 验证
  - [ ] 错误提示优化
  - [ ] 表单状态管理

### 阶段五：测试与优化（2-3天）

**任务清单**：
- [ ] 单元测试
  - [ ] 关键组件单元测试
  - [ ] Hooks 单元测试
  - [ ] 工具函数测试
- [ ] E2E 测试
  - [ ] 用户登录流程
  - [ ] CRUD 操作流程
  - [ ] 导航和路由测试
  - [ ] 表格交互测试
- [ ] 性能优化
  - [ ] 代码分割优化
  - [ ] 图片懒加载
  - [ ] 数据预加载
  - [ ] 路由预加载
- [ ] 错误处理完善
  - [ ] 全局错误边界测试
  - [ ] API 错误处理测试
  - [ ] 网络错误处理
  - [ ] 用户反馈优化
- [ ] 文档编写
  - [ ] 更新 README
  - [ ] 添加组件文档
  - [ ] 添加开发指南
  - [ ] 添加部署文档

---

## ⚠️ 风险评估与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **学习曲线** | 中 | 高 | - 预留学习时间<br>- 参考官方文档<br>- 代码审查和知识分享 |
| **功能回归** | 高 | 中 | - 完善的测试覆盖<br>- 分模块验证<br>- 保留旧版本回退方案 |
| **性能问题** | 中 | 低 | - 使用 Loader 预加载数据<br>- 代码分割和懒加载<br>- 性能监控和优化 |
| **第三方依赖** | 低 | 低 | - TanStack 库成熟稳定<br>- 活跃的社区支持<br>- 长期维护保障 |
| **团队协作** | 中 | 中 | - 代码审查流程<br>- 共享知识文档<br>- 定期技术分享会 |
| **时间延期** | 中 | 中 | - 预留缓冲时间<br>- 分阶段交付<br>- 优先级管理 |

---

## 📈 预期收益

### 开发体验提升

**类型安全**：
- ✅ 路径参数、搜索参数、loader 数据全部类型推断
- ✅ 编译时错误检测，减少运行时错误
- ✅ IDE 自动补全和类型提示

**代码可维护性**：
- ✅ 文件路由系统，路由结构清晰
- ✅ 组件化架构，代码复用性高
- ✅ 统一的错误处理和状态管理

### 用户体验提升

**性能优化**：
- ✅ 数据预加载和缓存
- ✅ 智能的重新验证策略
- ✅ 代码分割和懒加载

**交互体验**：
- ✅ URL 状态同步，可分享、可书签
- ✅ 主题切换，支持明暗模式
- ✅ 全局搜索，快速导航

### 团队效率提升

**开发速度**：
- ✅ 文件路由，减少配置代码
- ✅ 自动类型生成，减少手动类型定义
- ✅ 组件库复用，减少重复开发

**代码质量**：
- ✅ 类型安全，减少 Bug
- ✅ 统一的代码风格
- ✅ 完善的测试覆盖

---

## 📚 参考资源

### 官方文档

- [TanStack Router 文档](https://tanstack.com/router/latest)
- [TanStack Table 文档](https://tanstack.com/table/latest)
- [React Hook Form 文档](https://react-hook-form.com/)
- [Zod 文档](https://zod.dev/)
- [shadcn-admin 项目](https://github.com/satnaing/shadcn-admin)

### 社区资源

- [TanStack Router 示例](https://github.com/TanStack/router/tree/main/examples)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Vite 文档](https://vitejs.dev/)

---

## ✅ 设计确认

该设计方案已经与用户充分讨论并确认，包含：

- ✅ 整体架构设计
- ✅ 技术栈选型
- ✅ 项目结构重组
- ✅ 类型安全路由系统
- ✅ 数据加载与状态管理
- ✅ 布局与组件系统
- ✅ 错误处理策略
- ✅ 测试策略
- ✅ 实施计划（13-19天）
- ✅ 风险评估与缓解

**下一步**：开始创建详细的实施计划（Implementation Plan）

---

*文档创建日期: 2026-02-03*
*最后更新: 2026-02-03*
